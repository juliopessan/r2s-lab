"""Gera o favicon da marca R2S. a partir da fonte Inter Bold (licença OFL), com as letras em contorno,
para o ícone não depender da fonte instalada em quem abre a página.

Saídas: site/assets/favicon.svg (segue o tema claro/escuro do sistema) e, numa pasta temporária, as versões
em quadro branco (16, 32, 48 e 180) que tools/rasterize-favicon.cjs transforma em favicon.ico e
apple-touch-icon.png.
Uso: pip install fonttools pillow && python3 tools/build-favicon.py && node tools/rasterize-favicon.cjs
"""
import tempfile
import pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONTE = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
SAIDA = pathlib.Path(__file__).resolve().parent.parent / 'site' / 'assets'
TMP = pathlib.Path(tempfile.gettempdir()) / 'r2s-favicon'
TRACK = -0.03  # em, como o letter-spacing da marca no rodapé

font = TTFont(FONTE)
gs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font['head'].unitsPerEm

def glifos():
    """Contorno de cada letra em unidades da fonte, já posicionado na linha (y para baixo)."""
    x = 0
    out = []
    for ch in 'R2S':
        nome = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[nome].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        b = BoundsPen(gs); gs[nome].draw(b)
        out.append((ch, pen.getCommands(), x + b.bounds[0], x + b.bounds[2]))
        x += gs[nome].width + TRACK * upm
    return out, x

def marca(lado, margem, tile=None, escuro=False):
    letras, largura = glifos()
    cap = font['OS/2'].sCapHeight
    ponto_r = 0.11 * upm
    fim = letras[-1][3] + 0.06 * upm + 2 * ponto_r
    escala = (lado - 2 * margem) / fim
    altura = cap * escala
    tx = margem
    ty = lado / 2 + altura / 2
    cor_l = '#FFFFFF' if escuro else '#333333'
    cor_2 = '#FF7A33' if escuro else '#B43C14'
    partes = []
    if tile:
        partes.append(f'<rect width="{lado}" height="{lado}" rx="{lado * 0.22:.2f}" fill="{tile}"/>')
    partes.append(f'<g transform="translate({tx:.3f} {ty:.3f}) scale({escala:.5f})">')
    for ch, d, _, _ in letras:
        classe = 'dois' if ch == '2' else 'letra'
        partes.append(f'<path class="{classe}" fill="{cor_2 if ch == "2" else cor_l}" d="{d}"/>')
    cx = letras[-1][3] + 0.06 * upm + ponto_r
    partes.append(f'<circle class="ponto" fill="#FF5800" cx="{cx:.1f}" cy="{-ponto_r:.1f}" r="{ponto_r:.1f}"/>')
    partes.append('</g>')
    return partes

def svg_tema():
    corpo = '\n'.join(marca(64, 2))
    estilo = ('<style>.letra{fill:#333333}.dois{fill:#B43C14}'
              '@media (prefers-color-scheme:dark){.letra{fill:#FFFFFF}.dois{fill:#FF7A33}}</style>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{estilo}\n{corpo}\n</svg>\n'

def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    (SAIDA / 'favicon.svg').write_text(svg_tema(), encoding='utf-8')
    for lado, nome in [(16, 'favicon-16.svg'), (32, 'favicon-32.svg'), (48, 'favicon-48.svg'), (180, 'apple-touch-icon.svg')]:
        margem = lado * (0.12 if lado == 180 else 0.06)
        corpo = '\n'.join(marca(lado, margem, tile='#FFFFFF'))
        TMP.mkdir(exist_ok=True)
        (TMP / nome).write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{lado}" height="{lado}" viewBox="0 0 {lado} {lado}">{corpo}</svg>', encoding='utf-8')
    print('favicon.svg pronto; versões em quadro:', TMP)

if __name__ == '__main__':
    main()
