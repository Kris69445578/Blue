<?php
// Enable CORS for local development and cross-origin requests
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dataFile = __DIR__ . '/tournament_data.json';

// Handle POST requests (save data)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the raw POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        exit();
    }
    
    // Save to JSON file
    $result = file_put_contents($dataFile, json_encode($input, JSON_PRETTY_PRINT));
    
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save data']);
        exit();
    }
    
    echo json_encode(['success' => true, 'timestamp' => date('c')]);
    exit();
}

// Handle GET requests (load data)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        if ($content === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to read data']);
            exit();
        }
        echo $content;
    } else {
        // Return empty data structure if file doesn't exist
        echo json_encode(null);
    }
    exit();
}

// Method not allowed
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>
