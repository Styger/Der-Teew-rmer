function parseJsonHelper(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function calculate() {
    // retrieve information from the form (power, mass, initialTemp, finalTemp)
    let power = document.getElementById('power').value;
    let mass = document.getElementById('mass').value;
    let initialTemp = document.getElementById('initialTemp').value;
    let finalTemp = document.getElementById('finalTemp').value;
    let historyCheckbox = document.getElementById('historyCheckbox');
    let isHistorySelected = Boolean(historyCheckbox.checked);

    // Setzen den "request" mit den Daten aus dem Formular
    request = { power: power, mass: mass, initialTemp: initialTemp, finalTemp: finalTemp, historyCheckbox: isHistorySelected };

    let xhr = new XMLHttpRequest();
    xhr.onerror = function () { alert('Anwendungsfehler: Anfrage kann nicht gesendet werden'); }
    xhr.timeout = function () { alert('Anwendungsfehler: Zeitüberschreitung'); }
    xhr.onload = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status == 200) {
                let response = parseJsonHelper(xhr.responseText);
                if (response !== null && validate(response)) {
                    update(response);
                } else {
                    alert('Anwendungsfehler: Backend-Antwort konnte nicht validiert werdenn');
                }
            } else {
                alert('Anwendungsfehler: Backend-Antwort fehlerhaft. Statuscode: ' + xhr.status);
            }
        }
    }

    // POST-Anfrage
    xhr.open('POST', 'berechnung_wasser.php', true);

    // Daten als JSON-Dokument senden
    xhr.send(JSON.stringify(request));
}

function validate(response) {
    return response != null
        && Object.hasOwn(response, 'time')
        && !Number.isNaN(Number.parseFloat(response.time));
}

function update(response) {
    // Ausgabe der benötigten Zeit in einem Span mit der ID "outputTime"
    let outputTime = document.getElementById('outputTime');
    let hours = Math.floor(response.time / 3600);
    let minutes = Math.floor((response.time % 3600) / 60);
    let secondsOutput = Math.floor(response.time % 60);
    let lastResult = getCookie('LastResult'); // Hole das letzte Ergebnis aus dem Cookie
    let comparisonText = '';

    // Überprüfen, ob LastResult vorhanden und eine gültige Zahl ist
    if (lastResult && !isNaN(lastResult)) {
        lastResult = parseFloat(lastResult);
        if (parseFloat(response.time) > lastResult) {
            comparisonText = 'was länger wie das letzte Ergebnis war.';
        } else if (response.time < lastResult) {
            comparisonText = 'was kürzer wie das letzte Ergebnis war.';
        } else {
            comparisonText = 'was gleich lang wie das letzte Ergebnis war.';
        }
    }

    outputTime.innerText = `${hours} Stunden ${minutes} Minuten ${secondsOutput} Sekunden ${comparisonText} `;
    let seconds = Number.parseFloat(response.time);
    updateClock(seconds, 'clockCanvas0');

    fetchHistory();
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function validateInputElement(inputElementId, errorElementId) {
    let inputElement = document.getElementById(inputElementId);
    let errorElement = document.getElementById(errorElementId);

    if (!inputElement.checkValidity()) {
        errorElement.innerText = inputElement.validationMessage;
        errorElement.innerText = errorElement.innerText.replace('größer', 'grösser');
    }
}

function clearValidationErrors() {
    document.getElementById('errorPower').innerText = '';
    document.getElementById('errorMass').innerText = '';
    document.getElementById('errorInitialTemp').innerText = '';
    document.getElementById('errorFinalTemp').innerText = '';
}

function hasValidationErrors() {
    return document.getElementById('errorPower').innerText != ''
        || document.getElementById('errorMass').innerText != ''
        || document.getElementById('errorInitialTemp').innerText != ''
        || document.getElementById('errorFinalTemp').innerText != '';
}

function validateAndCalculate() {
    clearValidationErrors();
    // Validierungsfunktionen für Leistung, Masse, Temperatur
    validateInputElement('power', 'errorPower');
    validateInputElement('mass', 'errorMass');
    validateInputElement('initialTemp', 'errorInitialTemp');
    validateInputElement('finalTemp', 'errorFinalTemp');

    // Validierung finalTemp und initialTemp
    if (Number.parseFloat(document.getElementById('initialTemp').value) >= Number.parseFloat(document.getElementById('finalTemp').value)) {
        document.getElementById('errorInitialTemp').innerHTML = 'Die Anfangstemperatur muss kleiner als die Endtemperatur sein.';
    }

    if (!hasValidationErrors()) {
        calculate();
    }
}
//-----------------------------------------------------------------------------------------------------------------------------------------
//---------------Zeitkreis-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------------------------
function drawClock(ctx, seconds) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (seconds === 0) {
        return;
    }
    // Hintergrundkreis zeichnen
    ctx.beginPath();
    ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 100, 0, 2 * Math.PI);
    ctx.fillStyle = '#eee';
    ctx.fill();
    ctx.stroke();

    // Roten Bereich zeichnen basierend auf der Zeit in Sekunden
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2, ctx.canvas.height / 2);
    let endAngle;
    if (seconds > 3600) {
        // Umrechnung in Stunden und Anpassung des Endwinkels
        const hours = seconds / 3600;
        endAngle = (hours % 12) / 12 * 2 * Math.PI - Math.PI / 2;
    } else {
        endAngle = (seconds / 3600) * 2 * Math.PI - Math.PI / 2;
    }
    ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 100, -Math.PI / 2, endAngle);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.stroke();
    // Stundenmarkierungen zeichnen
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 2 * Math.PI;
        drawMarker(ctx, angle, 90, 100);
    }
    // Minutenmarkierungen zeichnen
    for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * 2 * Math.PI;
        drawMarker(ctx, angle, 95, 100);
    }
}

function drawMarker(ctx, angle, innerRadius, outerRadius) {
    const startX = ctx.canvas.width / 2 + (innerRadius * Math.cos(angle));
    const startY = ctx.canvas.height / 2 + (innerRadius * Math.sin(angle));

    const endX = ctx.canvas.width / 2 + (outerRadius * Math.cos(angle));
    const endY = ctx.canvas.height / 2 + (outerRadius * Math.sin(angle));

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

function updateClock(seconds, id) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    drawClock(ctx, seconds);
}

//---------------------------------------------History--------------------------------------------
function fetchHistory() {
    let xhr = new XMLHttpRequest();
    xhr.onerror = function () { alert('Anwendungsfehler: Anfrage kann nicht gesendet werden'); }
    xhr.timeout = function () { alert('Anwendungsfehler: Zeitüberschreitung'); }
    xhr.onload = function () {
        if (xhr.status === 200) {
            let response = parseJsonHelper(xhr.responseText);
            if (response) {
                renderHistory(response);
            } else {
                alert('Anwendungsfehler: Ungültige Daten im Verlauf');
            }
        } else {
            alert('Anwendungsfehler: Verlauf konnte nicht abgerufen werden. Statuscode: ' + xhr.status);
        }
    }

    // GET-Anfrage zum Abrufen des Verlaufs
    xhr.open('GET', 'berechnung_wasser.php', true);
    xhr.send();
}


function renderHistory(history) {
    let historySection = document.getElementById('historyTable');

    // Leere den aktuellen Inhalt
    historySection.innerHTML = '';

    // Erstelle eine Tabelle für den Verlauf
    let table = document.createElement('table');
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    // Erstelle die Tabellenkopfzeile
    let headerRow = document.createElement('tr');
    let headers = ['ID', 'Leistung', 'Masse', 'Anfangs-Temperatur', 'End-Temperatur', 'Zeit in Sekunden'];
    headers.forEach(headerText => {
        let th = document.createElement('th');
        th.appendChild(document.createTextNode(headerText));
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Fülle die Tabelle mit Verlaufsdaten
    history.forEach(entry => {
        let row = document.createElement('tr');
        for (let key in entry) {
            let cell = document.createElement('td');
            cell.appendChild(document.createTextNode(entry[key]));
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    historySection.appendChild(table);
}