CREATE DATABASE IF NOT EXISTS History;

USE History;

CREATE TABLE IF NOT EXISTS wassererhitzung_verlauf (
    id INT AUTO_INCREMENT PRIMARY KEY,
    power INT,
    mass INT,
    initialTemp INT,
    finalTemp INT,
    time INT,
    history BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


