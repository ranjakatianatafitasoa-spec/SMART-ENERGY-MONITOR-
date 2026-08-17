import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcImg = path.join(process.cwd(), 'src', 'assets', 'images', 'smart_energy_icon_1786956321978.jpg');

async function generateAllIcons() {
  if (!fs.existsSync(srcImg)) {
    console.error('Source image not found:', srcImg);
    return;
  }

  console.log('Generating high quality web and Android icons from:', srcImg);

  const resBase = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

  // 1. Web & PWA icons
  await sharp(srcImg).resize(512, 512).png().toFile(path.join(process.cwd(), 'public', 'icon.png'));
  await sharp(srcImg).resize(512, 512).png().toFile(path.join(process.cwd(), 'public', 'icon-512.png'));
  await sharp(srcImg).resize(192, 192).png().toFile(path.join(process.cwd(), 'public', 'icon-192.png'));
  await sharp(srcImg).resize(180, 180).png().toFile(path.join(process.cwd(), 'public', 'apple-touch-icon.png'));
  await sharp(srcImg).resize(96, 96).png().toFile(path.join(process.cwd(), 'public', 'notification-icon.png'));

  // 2. Android Mipmap densities
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48, fg: 108 },
    { dir: 'mipmap-hdpi', size: 72, fg: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fg: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fg: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fg: 432 },
  ];

  for (const m of mipmaps) {
    const dirPath = path.join(resBase, m.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Standard square icon
    await sharp(srcImg)
      .resize(m.size, m.size)
      .png()
      .toFile(path.join(dirPath, 'ic_launcher.png'));

    // Round icon (with circular alpha mask)
    const radius = m.size / 2;
    const circleSvg = Buffer.from(
      `<svg width="${m.size}" height="${m.size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#ffffff"/></svg>`
    );

    await sharp(srcImg)
      .resize(m.size, m.size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dirPath, 'ic_launcher_round.png'));

    // Adaptive icon foreground (centered with 15% safe margin)
    const emblemSize = Math.round(m.fg * 0.72);
    const padding = Math.round((m.fg - emblemSize) / 2);
    const emblemBuffer = await sharp(srcImg).resize(emblemSize, emblemSize).png().toBuffer();

    await sharp({
      create: {
        width: m.fg,
        height: m.fg,
        channels: 4,
        background: { r: 5, g: 11, b: 20, alpha: 1 },
      },
    })
      .composite([{ input: emblemBuffer, top: padding, left: padding }])
      .png()
      .toFile(path.join(dirPath, 'ic_launcher_foreground.png'));

    console.log(`Generated ${m.dir} icons (${m.size}px / fg ${m.fg}px)`);
  }

  // 3. Notification Small & Large Icons in Drawable folders
  const drawables = [
    'drawable',
    'drawable-hdpi',
    'drawable-mdpi',
    'drawable-xhdpi',
    'drawable-xxhdpi',
    'drawable-xxxhdpi',
  ];

  for (const d of drawables) {
    const dPath = path.join(resBase, d);
    if (!fs.existsSync(dPath)) {
      fs.mkdirSync(dPath, { recursive: true });
    }
    await sharp(srcImg).resize(96, 96).png().toFile(path.join(dPath, 'ic_stat_smart_energy.png'));
    await sharp(srcImg).resize(96, 96).png().toFile(path.join(dPath, 'ic_stat_icon.png'));
    await sharp(srcImg).resize(96, 96).png().toFile(path.join(dPath, 'ic_stat_icon_config_sample.png'));
    await sharp(srcImg).resize(96, 96).png().toFile(path.join(dPath, 'push_icon.png'));
    await sharp(srcImg).resize(192, 192).png().toFile(path.join(dPath, 'ic_launcher.png'));
  }

  // 4. Splash Screens (all portrait & landscape resolutions)
  const splashFolders = [
    { dir: 'drawable', w: 512, h: 512 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 1080, h: 1920 },
    { dir: 'drawable-port-xxxhdpi', w: 1440, h: 2560 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1920, h: 1080 },
    { dir: 'drawable-land-xxxhdpi', w: 2560, h: 1440 },
  ];

  for (const s of splashFolders) {
    const sPath = path.join(resBase, s.dir);
    if (!fs.existsSync(sPath)) {
      fs.mkdirSync(sPath, { recursive: true });
    }
    const logoSize = Math.min(Math.round(Math.min(s.w, s.h) * 0.4), 512);
    const logoBuffer = await sharp(srcImg).resize(logoSize, logoSize).png().toBuffer();
    const top = Math.round((s.h - logoSize) / 2);
    const left = Math.round((s.w - logoSize) / 2);

    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: { r: 5, g: 11, b: 20, alpha: 1 },
      },
    })
      .composite([{ input: logoBuffer, top, left }])
      .png()
      .toFile(path.join(sPath, 'splash.png'));
  }

  console.log('All icons & splash screens successfully generated!');
}

generateAllIcons().catch(console.error);

