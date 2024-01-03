<?php
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents("php://input");

function validate($request)
{
    $requiredParams = ['power', 'mass', 'initialTemp', 'finalTemp'];
    $error = null;

    if ($request == null) {
        $error = ['error' => "JSON-Eingabe konnte nicht geparst werden"];
    } else {
        foreach ($requiredParams as $param) {
            if (!isset($request[$param])) {
                $error = ['error' => "Parameter '$param' nicht gesetzt"];
                break;
            }
        }

        if ($error == null) {
            if (!is_numeric($request['power']) || $request['power'] < 10 || $request['power'] > 10000) {
                $error = ['error' => "Ungültiger Wert für Parameter 'power'"];
            } else if (!is_numeric($request['mass']) || $request['mass'] < 10 || $request['mass'] > 10000) {
                $error = ['error' => "Ungültiger Wert für Parameter 'mass'"];
            } else if (!is_numeric($request['initialTemp']) || $request['initialTemp'] < 1 || $request['initialTemp'] > 100 || $request['finalTemp'] <= $request['initialTemp']) {
                $error = ['error' => "Ungültiger Wert für Parameter 'initialTemp'"];
            } else if (!is_numeric($request['finalTemp']) || $request['finalTemp'] < 1 || $request['finalTemp'] > 100 || $request['finalTemp'] <= $request['initialTemp']) {
                $error = ['error' => "Ungültiger Wert für Parameter 'finalTemp'"];
            }
        }
    }

    if (isset($error)) {
        echo json_encode($error);
        http_response_code(400);
        exit;
    }
}

function calculateTime($power, $mass, $initialTemp, $finalTemp)
{
    // Wärmekapazität von Wasser
    $wasser_kap = 4.1851;

    // Temperaturdifferenz
    $temperaturdifferenz = $finalTemp - $initialTemp;

    // Berechnung der Zeit 
    $time = ($mass * $wasser_kap * $temperaturdifferenz) / $power;

    return $time;
}


function save_to_database($power, $mass, $initialTemp, $finalTemp, $time, $history)
{

    // Verbindung zur Datenbank herstellen
    $conn = mysqli_connect("localhost", "root", "", "History");

    // Überprüfen, ob die Verbindung erfolgreich war
    if (!$conn) {
        die("Connection failed: " . mysqli_connect_error());
    }

    // SQL-Query zum Speichern in der Datenbank
    $query = "INSERT INTO wassererhitzung_verlauf (power, mass, initialTemp, finalTemp, time, history) 
            VALUES (?, ?, ?, ?, ?, ?)";

    // SQL-Query vorbereiten
    $stmt = mysqli_prepare($conn, $query);

    // Überprüfen, ob die SQL-Query-Vorbereitung erfolgreich war
    if ($stmt) {

        mysqli_stmt_bind_param($stmt, 'iiiiii', $power, $mass, $initialTemp, $finalTemp, $time, $history);

        // SQL-Query ausführen
        mysqli_stmt_execute($stmt);

        // SQL-Query schliessen
        mysqli_stmt_close($stmt);
    } else {
        // Fehler beim Vorbereiten der SQL-Query
        echo json_encode(['error' => 'Error preparing SQL statement']);
    }

    // Verbindung zur Datenbank schließen
    mysqli_close($conn);
}

// Behandlung der Anfrage
if ($method == "POST") {
    // Parse body to JSON document
    $request = json_decode($body, true);

    // Validate JSON document
    validate($request);

    // Calculate time
    $time = calculateTime($request['power'], $request['mass'], $request['initialTemp'], $request['finalTemp']);

    if ($request['historyCheckbox'] == "true") {
        $history = true;
    } else {
        $history = false;
    }
    $history = $request['historyCheckbox'];

    //In DB speichern
    save_to_database($request['power'], $request['mass'], $request['initialTemp'], $request['finalTemp'], $time, $history);

    // Aktuellen Wert von 'CurrentResult' abrufen und für 'LastResult' verwenden
    if (isset($_COOKIE['CurrentResult'])) {
        setcookie("LastResult", $_COOKIE['CurrentResult'], time() + 86400, "/");
    }

    // 'CurrentResult' mit dem neuen Wert aktualisieren
    setcookie("CurrentResult", $time, time() + 86400, "/");

    // Return result
    echo json_encode(['time' => $time]);

} else if ($method == "GET") {
    // Verbindung zur Datenbank herstellen
    $conn = mysqli_connect("localhost", "root", "", "History");

    // Überprüfen, ob die Verbindung erfolgreich war
    if (!$conn) {
        die("Connection failed: " . mysqli_connect_error());
    }

    // SQL-Query zum Abrufen des Verlaufs mit history = true
    $query = "SELECT id,power,mass,initialTemp,finalTemp,time FROM wassererhitzung_verlauf WHERE history = true ORDER BY created_at DESC";

    // SQL-Query ausführen
    $result = mysqli_query($conn, $query);

    // Verlauf in ein assoziatives Array konvertieren
    $history = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $history[] = $row;
    }

    // Verbindung zur Datenbank schliessen
    mysqli_close($conn);

    // Antwort als JSON zurückgeben
    header('Content-Type: application/json');
    echo json_encode($history);

} else {
    echo json_encode(['error' => "HTTP-Methode '" . $method . "' wird nicht unterstützt"]);
    http_response_code(400);
    exit;
}