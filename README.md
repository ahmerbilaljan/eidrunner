# Eidi Runner - Customization & Deployment Guide

This guide explains how to customize the aesthetics of the game and how to publish it live to the web.

## 🎨 Modifying Colors & Backgrounds

The game's visuals are heavily customizable. They are split between `index.html` (for the overlays and UI) and `js/game.js` (for the actual moving game graphics).

### 1. Changing the Font
We used **Montserrat** via Google Fonts. To change this:
- **UI Text**: In `index.html`, locate the `<style>` block at the top. Change the `@import url(...)` to your preferred font from Google Fonts, and update the `font-family: 'YourFont', sans-serif;` rule.
- **Canvas Text (The 'E' in Eidi)**: In `js/game.js`, search (Ctrl+F) for `ctx.font = '900 13px Montserrat';` and change "Montserrat" to your new font.

### 2. Changing Backgrounds & Colors
Look inside `js/game.js` for the `drawBackground()` function. You can easily replace the HEX colors there:
- **Sky Background**: 
  ```javascript
  skyGrad.addColorStop(0, '#4B8BF5'); // Top sky color
  skyGrad.addColorStop(1, '#9CC9F5'); // Bottom sky color
  ```
- **Dirt/Grass**: Modify `ctx.fillStyle = '#6E340B';` (Dirt) and `ctx.fillStyle = '#2DAA2D';` (Grass).
- **Pillars & Coins**: Inside the `Pillar` and `Coin` classes in `js/game.js`, locate lines like `ctx.fillStyle = 'navy';` or `ctx.fillStyle = '#FFC000';` and change them to any color you prefer.

---

## 🖼️ Replacing Shapes with Image Assets (Sprites)

Right now, the character, clouds, and coins are drawn using mathematical shapes (HTML5 Canvas Geometry). If you want to use PNG, SVG, or JPG images instead, it is incredibly simple:

**Step 1: Load your image**
At the very top of `js/game.js`, load your custom image:
```javascript
const playerImage = new Image();
// Create an 'img' folder, drop your file in, and link it!
playerImage.src = 'img/my-character.png'; 
```

**Step 2: Replace the `draw()` method**
Inside the `class Player` block in `js/game.js`, delete the complex geometric drawing code inside the `draw()` method and replace it with one line:
```javascript
draw() {
    // This draws the image precisely at the player's physical coordinates
    ctx.drawImage(playerImage, this.x, this.y, this.width, this.height);
}
```
*Note: You can do this exact same thing for the `Coin`, `Cloud`, and `Pillar` classes to replace them all with your own art!*

---

## 🚀 Hosting on Vercel (Free & Easy)

Because this game is created purely with standard HTML, CSS, and JavaScript (no complex build tools required), it is lightning fast to host.

**The Easiest Way: Vercel Drag and Drop**
1. Create a free account at [Vercel.com](https://vercel.com).
2. Go to your Vercel Dashboard and click **Add New... > Project**.
3. Vercel allows you to seamlessly host by just uploading files. Select the option to **Upload a Folder** (or if you put this code on GitHub, you can link the repository).
4. Select the `endless-coin-climber` folder on your computer.
5. Click **Deploy**.
6. Within seconds, Vercel will give you a live, public URL (e.g., `eidi-runner.vercel.app`) that you can instantly share with the world!
