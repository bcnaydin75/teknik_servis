<?php
/**
 * Firma ayarları, personel yönetimi
 *
 * GET  ?action=profile|staff
 * POST ?action=profile|staff_add|staff_update|staff_delete|change_password|upload_logo
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/i18n.php';
require_once __DIR__ . '/auth_guard.php';
require_once __DIR__ . '/schema_guard.php';

setCorsHeaders();
handlePreflight();
initApiLocale($conn);
requireAdmin();
ensureSchema($conn);

$action = $_GET['action'] ?? '';

if ($action === 'profile' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['success' => true, 'data' => getShopSettings($conn)], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'profile' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requirePermission('settings');
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        apiFail(400, 'invalid_request');
    }

    $firma = trim($input['firma_adi'] ?? '');
    $adres = trim($input['adres'] ?? '') ?: null;
    $telefon = trim($input['telefon'] ?? '') ?: null;
    $email = trim($input['email'] ?? '') ?: null;
    $defaultLocale = normalizeLocale($input['default_locale'] ?? 'tr');
    $ucretDetayi = !empty($input['ucret_detayi_goster']) ? 1 : 0;

    if ($firma === '') {
        apiFail(400, 'company_name_required');
    }

    $stmt = $conn->prepare(
        'UPDATE shop_settings SET firma_adi = ?, adres = ?, telefon = ?, email = ?, default_locale = ?, ucret_detayi_goster = ? WHERE id = 1'
    );
    $stmt->bind_param('sssssi', $firma, $adres, $telefon, $email, $defaultLocale, $ucretDetayi);
    $stmt->execute();
    $stmt->close();

    apiOk(['data' => getShopSettings($conn)], 'company_saved');
}

if ($action === 'upload_logo' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requirePermission('settings');
    if (empty($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
        apiFail(400, 'logo_upload_failed');
    }

    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $mime = mime_content_type($_FILES['logo']['tmp_name']);
    if (!in_array($mime, $allowed, true)) {
        apiFail(400, 'logo_invalid_type');
    }

    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        default => 'png',
    };

    $dest = dirname(__DIR__) . '/uploads/logo.' . $ext;
    if (!move_uploaded_file($_FILES['logo']['tmp_name'], $dest)) {
        apiFail(500, 'logo_save_failed');
    }

    $logoPath = 'uploads/logo.' . $ext;
    $stmt = $conn->prepare('UPDATE shop_settings SET logo_path = ? WHERE id = 1');
    $stmt->bind_param('s', $logoPath);
    $stmt->execute();
    $stmt->close();

    apiOk(['data' => getShopSettings($conn)], 'logo_uploaded');
}

if ($action === 'staff' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    requirePermission('settings');
    $result = $conn->query(
        'SELECT id, username, role, ad_soyad, aktif, olusturma_tarihi FROM admin_users ORDER BY id ASC'
    );
    $staff = [];
    while ($row = $result->fetch_assoc()) {
        $staff[] = [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'role' => $row['role'],
            'ad_soyad' => $row['ad_soyad'],
            'aktif' => (bool) $row['aktif'],
            'olusturma_tarihi' => $row['olusturma_tarihi'],
        ];
    }
    echo json_encode(['success' => true, 'data' => $staff], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'staff_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requirePermission('settings');
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $role = trim($input['role'] ?? 'teknisyen');
    $adSoyad = trim($input['ad_soyad'] ?? '') ?: null;

    if ($username === '' || $password === '') {
        apiFail(400, 'username_password_required');
    }

    $pwdError = validatePasswordMsg($password);
    if ($pwdError) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $pwdError], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!in_array($role, ['admin', 'teknisyen', 'kasa'], true)) {
        apiFail(400, 'invalid_role');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare(
        'INSERT INTO admin_users (username, password_hash, role, ad_soyad) VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('ssss', $username, $hash, $role, $adSoyad);

    if (!$stmt->execute()) {
        apiFail(400, 'username_taken');
    }
    $stmt->close();

    apiOk([], 'staff_added');
}

if ($action === 'staff_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requirePermission('settings');
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int) ($input['id'] ?? 0);
    $role = trim($input['role'] ?? '');
    $adSoyad = trim($input['ad_soyad'] ?? '') ?: null;
    $aktif = isset($input['aktif']) ? (int) (bool) $input['aktif'] : 1;
    $password = $input['password'] ?? '';

    if ($id <= 0) {
        apiFail(400, 'invalid_staff');
    }

    if ($password !== '') {
        $pwdError = validatePasswordMsg($password);
        if ($pwdError) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $pwdError], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare(
            'UPDATE admin_users SET role = ?, ad_soyad = ?, aktif = ?, password_hash = ?, must_change_password = 0 WHERE id = ?'
        );
        $stmt->bind_param('ssisi', $role, $adSoyad, $aktif, $hash, $id);
    } else {
        $stmt = $conn->prepare(
            'UPDATE admin_users SET role = ?, ad_soyad = ?, aktif = ? WHERE id = ?'
        );
        $stmt->bind_param('ssii', $role, $adSoyad, $aktif, $id);
    }

    $stmt->execute();
    $stmt->close();

    apiOk([], 'staff_updated');
}

if ($action === 'staff_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requirePermission('settings');
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int) ($input['id'] ?? 0);
    $currentId = (int) ($_SESSION['admin_id'] ?? 0);

    if ($id <= 0) {
        apiFail(400, 'invalid_staff');
    }

    if ($id === $currentId) {
        apiFail(400, 'cannot_delete_self');
    }

    $stmt = $conn->prepare('SELECT id, username, role FROM admin_users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $target = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$target) {
        apiFail(404, 'staff_not_found');
    }

    if ($target['role'] === 'admin') {
        $adminCount = $conn->query("SELECT COUNT(*) AS cnt FROM admin_users WHERE role = 'admin'");
        $row = $adminCount->fetch_assoc();
        if ((int) ($row['cnt'] ?? 0) <= 1) {
            apiFail(400, 'last_admin_cannot_delete');
        }
    }

    $stmt = $conn->prepare('DELETE FROM admin_users WHERE id = ?');
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $stmt->close();

    if (!$ok) {
        apiFail(500, 'staff_delete_failed');
    }

    apiOk(['data' => ['username' => $target['username']]], 'staff_deleted');
}

if ($action === 'change_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $oldPassword = $input['old_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    $userId = (int) $_SESSION['admin_id'];

    $pwdError = validatePasswordMsg($newPassword);
    if ($pwdError) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $pwdError], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $conn->prepare('SELECT password_hash FROM admin_users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($oldPassword, $user['password_hash'])) {
        apiFail(401, 'wrong_current_password');
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare('UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?');
    $stmt->bind_param('si', $hash, $userId);
    $stmt->execute();
    $stmt->close();

    apiOk([], 'password_changed');
}

apiFail(405, 'invalid_request');
