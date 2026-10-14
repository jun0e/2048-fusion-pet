// One-colour element glyphs (the second channel beside colour, for colour-blind
// players): flame, hex snowflake, bolt, droplet, square rock, swirl, gear, leaf.
// Drawn into a 0..1 box; the caller sets fill/stroke.

const TAU = Math.PI * 2;

export function glyphPath(el) {
  const p = new Path2D();
  switch (el) {
    case 'fire':
      p.moveTo(0.5, 0.06);
      p.bezierCurveTo(0.62, 0.3, 0.86, 0.4, 0.84, 0.66);
      p.bezierCurveTo(0.82, 0.86, 0.66, 0.95, 0.5, 0.95);
      p.bezierCurveTo(0.32, 0.95, 0.16, 0.84, 0.17, 0.64);
      p.bezierCurveTo(0.18, 0.5, 0.28, 0.42, 0.34, 0.34);
      p.bezierCurveTo(0.36, 0.48, 0.42, 0.55, 0.47, 0.56);
      p.bezierCurveTo(0.44, 0.38, 0.46, 0.2, 0.5, 0.06);
      p.closePath();
      break;
    case 'ice':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        const x = 0.5 + Math.cos(a) * 0.44;
        const y = 0.5 + Math.sin(a) * 0.44;
        const a2 = a + Math.PI / 2;
        const w = 0.07;
        p.moveTo(0.5 + Math.cos(a2) * w, 0.5 + Math.sin(a2) * w);
        p.lineTo(x + Math.cos(a2) * w, y + Math.sin(a2) * w);
        p.lineTo(x - Math.cos(a2) * w, y - Math.sin(a2) * w);
        p.lineTo(0.5 - Math.cos(a2) * w, 0.5 - Math.sin(a2) * w);
        p.closePath();
      }
      p.moveTo(0.64, 0.5);
      p.arc(0.5, 0.5, 0.14, 0, TAU);
      break;
    case 'lightning':
      p.moveTo(0.6, 0.04);
      p.lineTo(0.2, 0.56);
      p.lineTo(0.46, 0.56);
      p.lineTo(0.36, 0.96);
      p.lineTo(0.82, 0.4);
      p.lineTo(0.55, 0.4);
      p.closePath();
      break;
    case 'poison':
      p.moveTo(0.42, 0.1);
      p.bezierCurveTo(0.52, 0.32, 0.74, 0.46, 0.74, 0.66);
      p.bezierCurveTo(0.74, 0.84, 0.6, 0.94, 0.44, 0.94);
      p.bezierCurveTo(0.28, 0.94, 0.14, 0.84, 0.14, 0.66);
      p.bezierCurveTo(0.14, 0.46, 0.34, 0.32, 0.42, 0.1);
      p.closePath();
      p.moveTo(0.92, 0.26);
      p.arc(0.8, 0.26, 0.12, 0, TAU);
      break;
    case 'earth':
      p.moveTo(0.14, 0.4);
      p.lineTo(0.34, 0.14);
      p.lineTo(0.7, 0.12);
      p.lineTo(0.88, 0.36);
      p.lineTo(0.86, 0.84);
      p.lineTo(0.16, 0.86);
      p.closePath();
      break;
    case 'wind': {
      // a thick spiral approximated by stacked arcs
      p.moveTo(0.92, 0.5);
      p.arc(0.5, 0.5, 0.42, 0, Math.PI * 1.5, false);
      p.arc(0.5, 0.38, 0.3, Math.PI * 1.5, Math.PI * 0.6, true);
      p.arc(0.56, 0.5, 0.16, Math.PI * 0.6, Math.PI * 2.1, false);
      p.arc(0.54, 0.47, 0.05, Math.PI * 2.1, Math.PI * 0.8, true);
      p.arc(0.5, 0.42, 0.18, Math.PI * 0.8, Math.PI * 1.6, false);
      p.arc(0.5, 0.52, 0.32, Math.PI * 1.6, Math.PI * 0.2, false);
      p.closePath();
      break;
    }
    case 'metal': {
      const teeth = 8;
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * TAU;
        const r = i % 2 ? 0.34 : 0.46;
        const a0 = a - TAU / (teeth * 4);
        const a1 = a + TAU / (teeth * 4);
        if (i === 0) p.moveTo(0.5 + Math.cos(a0) * r, 0.5 + Math.sin(a0) * r);
        else p.lineTo(0.5 + Math.cos(a0) * r, 0.5 + Math.sin(a0) * r);
        p.lineTo(0.5 + Math.cos(a1) * r, 0.5 + Math.sin(a1) * r);
      }
      p.closePath();
      p.moveTo(0.64, 0.5);
      p.arc(0.5, 0.5, 0.14, 0, TAU, true);
      break;
    }
    case 'nature':
      p.moveTo(0.16, 0.86);
      p.bezierCurveTo(0.1, 0.46, 0.4, 0.12, 0.88, 0.1);
      p.bezierCurveTo(0.9, 0.56, 0.6, 0.88, 0.16, 0.86);
      p.closePath();
      break;
    default:
      p.arc(0.5, 0.5, 0.4, 0, TAU);
  }
  return p;
}

/** Draw a glyph badge: a coloured disc with an ink ring and a white glyph. */
export function drawBadge(g, el, cx, cy, r, color, ink) {
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fillStyle = color;
  g.fill();
  g.lineWidth = Math.max(1.5, r * 0.22);
  g.strokeStyle = ink;
  g.stroke();
  const s = r * 1.24;
  g.translate(cx - s / 2, cy - s / 2);
  g.scale(s, s);
  const p = glyphPath(el);
  g.lineJoin = 'round';
  g.lineWidth = 0.14;
  g.strokeStyle = ink;
  g.stroke(p);
  g.fillStyle = '#ffffff';
  g.fill(p, 'evenodd');
  g.restore();
}
