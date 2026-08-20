<?php
// Admin de productos e inventario: crear, editar, quitar, stock, destacar.
declare(strict_types=1);
require __DIR__ . '/../lib.php';
start_secure_session();
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
function csrf_ok(): bool
{
    return isset($_POST['csrf']) && hash_equals($_SESSION['csrf'], (string) $_POST['csrf']);
}

$me = current_user();
if (!$me || !in_array('admin', user_roles($me['id']), true)) {
    header('Location: index.php');
    exit;
}

$flash = null;
$flashType = 'ok';
$IMG = [
    'netflix', 'disney', 'hbomax', 'primevideo', 'paramount', 'vix', 'directvgo',
    'youtube', 'spotify', 'winplus', 'combo', 'streaming', 'musica', 'vpn', 'gaming',
    'nube', 'ofimatica', 'diseno', 'antivirus',
];

// --- Acciones ---
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok()) {
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'save') {
            $id = trim((string) ($_POST['id'] ?? ''));
            $name = trim((string) ($_POST['name'] ?? ''));
            $slug = trim((string) ($_POST['slug'] ?? ''));
            if ($slug === '') {
                $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name));
            }
            $slug = trim((string) preg_replace('/-+/', '-', $slug), '-');
            $benefits = json_encode(array_values(array_filter(array_map(
                'trim',
                explode("\n", (string) ($_POST['benefits'] ?? ''))
            ))), JSON_UNESCAPED_UNICODE);
            $stockRaw = trim((string) ($_POST['stock'] ?? ''));
            $stock = $stockRaw === '' ? null : max(0, (int) $stockRaw);
            $fields = [
                'category_id' => ($_POST['category_id'] ?? '') ?: null,
                'name' => $name,
                'slug' => $slug,
                'short_description' => trim((string) ($_POST['short_description'] ?? '')),
                'description' => trim((string) ($_POST['description'] ?? '')),
                'benefits' => $benefits,
                'image_url' => trim((string) ($_POST['image_url'] ?? '')) ?: null,
                'price' => (float) ($_POST['price'] ?? 0),
                'duration_days' => max(1, (int) ($_POST['duration_days'] ?? 30)),
                'billing_label' => trim((string) ($_POST['billing_label'] ?? 'mensual')),
                'stock' => $stock,
                'is_active' => isset($_POST['is_active']) ? 1 : 0,
                'is_featured' => isset($_POST['is_featured']) ? 1 : 0,
            ];
            if ($id) {
                $set = implode(', ', array_map(fn($k) => "$k = :$k", array_keys($fields)));
                $st = db()->prepare("UPDATE products SET $set WHERE id = :id");
                $st->execute($fields + ['id' => $id]);
                $flash = 'Producto actualizado.';
            } else {
                $fields = ['id' => uuid4()] + $fields;
                $cols = implode(', ', array_keys($fields));
                $ph = implode(', ', array_map(fn($k) => ":$k", array_keys($fields)));
                db()->prepare("INSERT INTO products ($cols) VALUES ($ph)")->execute($fields);
                $flash = 'Producto creado.';
            }
        } elseif ($action === 'delete' && !empty($_POST['id'])) {
            db()->prepare('DELETE FROM products WHERE id = ?')->execute([$_POST['id']]);
            $flash = 'Producto eliminado.';
        } elseif ($action === 'toggle' && !empty($_POST['id']) && !empty($_POST['field'])) {
            $field = $_POST['field'] === 'is_featured' ? 'is_featured' : 'is_active';
            db()->prepare("UPDATE products SET $field = 1 - $field WHERE id = ?")->execute([$_POST['id']]);
            $flash = 'Actualizado.';
        }
    } catch (Throwable $ex) {
        $flash = 'Error: ' . $ex->getMessage();
        $flashType = 'err';
    }
}

$cats = db()->query('SELECT id, name FROM categories ORDER BY sort_order, name')->fetchAll();
$catName = [];
foreach ($cats as $c) {
    $catName[$c['id']] = $c['name'];
}
$editId = $_GET['edit'] ?? null;
$edit = null;
if ($editId) {
    $st = db()->prepare('SELECT * FROM products WHERE id = ?');
    $st->execute([$editId]);
    $edit = $st->fetch() ?: null;
}
$showForm = isset($_GET['new']) || $edit;
$products = db()->query('SELECT * FROM products ORDER BY is_featured DESC, name')->fetchAll();
$billing = ['mensual', 'trimestral', 'semestral', 'anual', 'único'];

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Productos — Admin Lo Máximo Leo</title>
<style>
  :root { --bg:#0A0F1E; --card:#111828; --line:#243049; --gold:#e8b64c; --muted:#8a97ad; --text:#e9eef7; }
  *{box-sizing:border-box;} body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,sans-serif;}
  .wrap{max-width:1080px;margin:0 auto;padding:20px 16px;}
  a{color:var(--gold);text-decoration:none;} h1{font-size:22px;}
  .nav{display:flex;gap:14px;margin-bottom:8px;font-size:14px;} .nav a{color:var(--muted);} .nav a.on{color:var(--gold);font-weight:700;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:14px;}
  input,select,textarea{width:100%;padding:9px 11px;border-radius:9px;border:1px solid var(--line);background:#0d1424;color:var(--text);}
  label{display:block;font-size:12px;color:var(--muted);margin:10px 0 4px;}
  button,.btn{cursor:pointer;border:0;border-radius:9px;padding:9px 14px;font-weight:600;background:var(--gold);color:#1a1205;text-decoration:none;display:inline-block;}
  .btn.ghost,button.ghost{background:transparent;border:1px solid var(--line);color:var(--text);}
  .btn.del{background:#3a1720;color:#ffb0bd;border:1px solid #7a2740;}
  table{width:100%;border-collapse:collapse;font-size:14px;} th,td{text-align:left;padding:9px;border-bottom:1px solid var(--line);}
  th{color:var(--muted);font-size:12px;text-transform:uppercase;}
  .flash{padding:10px 12px;border-radius:9px;margin:12px 0;} .flash.ok{background:#14351f;border:1px solid #1f6b3b;color:#9be7b4;} .flash.err{background:#3a1720;border:1px solid #7a2740;color:#ffb0bd;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;} .pill{padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);}
  .thumb{width:54px;height:32px;object-fit:cover;border-radius:6px;}
  .warn{color:var(--gold);} .danger{color:#ff8f8f;} .ok{color:#8be79b;} .muted{color:var(--muted);}
</style>
</head>
<body>
<?php include __DIR__ . '/../brand.php'; ?>
<div class="wrap">
  <div class="nav">
    <a href="index.php">Resumen</a>
    <a href="productos.php" class="on">Productos</a>
    <a href="pagos.php">Pagos</a>
    <a href="tickets.php">Tickets</a>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <h1>Productos e inventario</h1>
    <a class="btn" href="productos.php?new=1">+ Nuevo producto</a>
  </div>
  <?php if ($flash): ?><div class="flash <?= $flashType ?>"><?= e($flash) ?></div><?php endif; ?>

  <?php if ($showForm): ?>
    <div class="card">
      <h2 style="margin-top:0;font-size:17px;"><?= $edit ? 'Editar producto' : 'Nuevo producto' ?></h2>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id" value="<?= e($edit['id'] ?? '') ?>">
        <div class="grid2">
          <div><label>Nombre</label><input name="name" required value="<?= e($edit['name'] ?? '') ?>"></div>
          <div><label>Slug (URL, opcional)</label><input name="slug" value="<?= e($edit['slug'] ?? '') ?>" placeholder="se genera del nombre"></div>
        </div>
        <div class="grid2">
          <div><label>Categoría</label><select name="category_id"><option value="">— Sin categoría —</option>
            <?php foreach ($cats as $c): ?><option value="<?= e($c['id']) ?>" <?= (($edit['category_id'] ?? '') === $c['id']) ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?>
          </select></div>
          <div><label>Facturación</label><select name="billing_label">
            <?php foreach ($billing as $b): ?><option <?= (($edit['billing_label'] ?? 'mensual') === $b) ? 'selected' : '' ?>><?= e($b) ?></option><?php endforeach; ?>
          </select></div>
        </div>
        <div class="grid2">
          <div><label>Precio (USD)</label><input name="price" type="number" step="0.01" min="0" required value="<?= e((string) ($edit['price'] ?? '')) ?>"></div>
          <div><label>Duración (días)</label><input name="duration_days" type="number" min="1" value="<?= e((string) ($edit['duration_days'] ?? '30')) ?>"></div>
        </div>
        <div class="grid2">
          <div><label>Inventario / stock (vacío = ilimitado, 0 = agotado)</label><input name="stock" type="number" min="0" value="<?= e($edit && $edit['stock'] !== null ? (string) $edit['stock'] : '') ?>"></div>
          <div><label>Imagen</label><select name="image_url">
            <option value="">— Sin imagen —</option>
            <?php foreach ($IMG as $img): $val = "/images/products/$img.jpg"; ?>
              <option value="<?= $val ?>" <?= (($edit['image_url'] ?? '') === $val) ? 'selected' : '' ?>><?= e($img) ?></option>
            <?php endforeach; ?>
          </select></div>
        </div>
        <label>Descripción corta</label><input name="short_description" maxlength="200" value="<?= e($edit['short_description'] ?? '') ?>">
        <label>Descripción completa</label><textarea name="description" rows="3"><?= e($edit['description'] ?? '') ?></textarea>
        <label>Beneficios (uno por línea)</label><textarea name="benefits" rows="4"><?php
            if ($edit && $edit['benefits']) {
                $bs = json_decode($edit['benefits'], true);
                echo e(is_array($bs) ? implode("\n", $bs) : '');
            }
        ?></textarea>
        <div style="display:flex;gap:20px;margin-top:12px;">
          <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" name="is_active" style="width:auto" <?= (!$edit || $edit['is_active']) ? 'checked' : '' ?>> Visible en la tienda</label>
          <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" name="is_featured" style="width:auto" <?= ($edit && $edit['is_featured']) ? 'checked' : '' ?>> Destacado</label>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;">
          <button type="submit"><?= $edit ? 'Guardar cambios' : 'Crear producto' ?></button>
          <a class="btn ghost" href="productos.php">Cancelar</a>
        </div>
      </form>
    </div>
  <?php endif; ?>

  <div class="card">
    <table>
      <thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($products as $p): ?>
        <tr>
          <td><?php if ($p['image_url']): ?><img class="thumb" src="<?= e($p['image_url']) ?>" alt=""><?php endif; ?></td>
          <td><b><?= e($p['name']) ?></b><?php if ($p['is_featured']): ?> <span class="pill warn">★</span><?php endif; ?><br><span class="muted" style="font-size:12px"><?= e($p['slug']) ?></span></td>
          <td class="muted"><?= e($catName[$p['category_id']] ?? '—') ?></td>
          <td>$<?= number_format((float) $p['price'], 2) ?><br><span class="muted" style="font-size:12px"><?= e($p['billing_label']) ?></span></td>
          <td><?php if ($p['stock'] === null): ?><span class="muted">∞</span><?php elseif ((int) $p['stock'] <= 0): ?><span class="danger">Agotado</span><?php else: ?><span class="ok"><?= (int) $p['stock'] ?></span><?php endif; ?></td>
          <td>
            <form method="post" style="display:inline"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="toggle"><input type="hidden" name="field" value="is_active"><input type="hidden" name="id" value="<?= e($p['id']) ?>">
              <button class="ghost" type="submit" style="padding:4px 10px"><?= $p['is_active'] ? 'Visible' : 'Oculto' ?></button></form>
          </td>
          <td style="text-align:right;white-space:nowrap;">
            <a class="btn ghost" style="padding:6px 12px" href="productos.php?edit=<?= e($p['id']) ?>">Editar</a>
            <form method="post" style="display:inline" onsubmit="return confirm('¿Eliminar este producto?')"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= e($p['id']) ?>">
              <button class="del" type="submit" style="padding:6px 12px">Quitar</button></form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
