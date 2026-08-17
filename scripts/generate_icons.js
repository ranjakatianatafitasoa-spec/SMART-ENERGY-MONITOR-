import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcImg = path.join(process.cwd(), 'src', 'assets', 'images', 'app_energy_logo_1786944924103.jpg');

async function generateAllIcons() {
  if (!fs.existsSync(srcImg)) {
    console.error('Source image not found:', srcImg);
    return;
  }

  console.log('Generating high quality web and Android icons from:', srcImg);

  // 1. Web / PWA icons
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

  const resBase = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

  for (const m of mipmaps) {
    const dirPath = path.join(resBase, m.dir);
    if (fs.existsSync(dirPath)) {
      await sharp(srcImg).resize(m.size, m.size).png().toFile(path.join(dirPath, 'ic_launcher.png'));
      await sharp(srcImg).resize(m.size, m.size).png().toFile(path.join(dirPath, 'ic_launcher_round.png'));
      await sharp(srcImg).resize(m.fg, m.fg).png().toFile(path.join(dirPath, 'ic_launcher_foreground.png'));
      console.log(`Generated ${m.dir} icons (${m.size}px / fg ${m.fg}px)`);
    }
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
  }

  // 4. Splash Screens
  const splashPath = path.join(resBase, 'drawable', 'splash.png');
  await sharp(srcImg).resize(512, 512).png().toFile(splashPath);

  console.log('All icons generated successfully!');
}

generateAllIcons().catch(console.error);
