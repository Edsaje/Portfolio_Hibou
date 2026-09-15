<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>🦉 Test PHP OVH</h1>";
echo "<p>PHP Version: <strong>" . phpversion() . "</strong></p>";
echo "<p>Dossier API : <strong>" . __DIR__ . "</strong></p>";
echo "<p>Permissions écriture dossier api/ : <strong>" . (is_writable(__DIR__) ? '✅ OUI' : '❌ NON (Vérifier chmod 755 ou 705)') . "</strong></p>";
echo "<p>Session support : <strong>" . (function_exists('session_start') ? '✅ OUI' : '❌ NON') . "</strong></p>";
echo "<p>Bcrypt password_hash : <strong>" . (function_exists('password_hash') ? '✅ OUI' : '❌ NON') . "</strong></p>";
?>
