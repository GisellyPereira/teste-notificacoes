# Doca — inteligência para pátios logísticos

Landing page de uma empresa **fictícia** de logística, inspirada no estilo de sites como o da Terminal: hero cinematográfico, pátio em 3D com nuvem de pontos e experiência pensada também para o celular.

**Site no ar:** https://doca-patio.netlify.app

## Seções e animações

1. **Hero:** foto do caminhão no pátio ao pôr do sol. Ao rolar, a frase "Reinventamos o futuro da logística a partir do pátio." acende palavra por palavra, a foto aproxima e escurece para emendar com o 3D.
2. **Pátio 3D (Three.js):** galpão, docas acesas, carretas e caminhões em movimento, tudo em nuvem de pontos. Os pontos se montam ao entrar na seção, e a câmera voa do alto até o nível das docas conforme o scroll. Etiquetas acompanham os objetos (portão, docas, caminhão TR-4821), o painel mostra veículos, docas ativas e tempo portão→doca, e o texto muda em três etapas.
3. **Clientes:** duas faixas de logos fictícios em sentidos opostos, que aceleram com o scroll.
4. **Módulos:** quatro cards com mini-animações (leitura no portão, pátio ao vivo, docas, gráfico).
5. **Resultados:** números animados sobre a foto das docas com parallax.
6. **CTA** com formulário de demonstração e rodapé.

O menu muda de cor nas seções claras e se esconde ao rolar para baixo. O site respeita `prefers-reduced-motion` e, se o aparelho não tiver WebGL, mostra uma foto no lugar do 3D.

## Stack

Vite, Three.js, GSAP (ScrollTrigger) e Lenis. Fotos geradas com IA (Figma). Logos e marcas são fictícios.

## Rodar localmente

```bash
npm install
npm run dev
```

Build: `npm run build` (gera `dist/`). O deploy na Netlify usa o `netlify.toml`.
