# placar

Placar simples para celular, com dois times, que funciona com a tela em pé ou deitada.

**Acesse:** https://patrickvsilva.github.io/placar/

## Como usar

- **Tocar** ou **arrastar para cima** na metade de um time soma 1 ponto.
- **Arrastar para baixo** tira 1 ponto.
- **Segurar** vai tirando pontos, cada vez mais rápido, até você soltar ou o placar chegar a 0.
Os botões no centro da tela:

- **Configurar**: edita o nome e a cor de cada time.
- **Zerar**: zera o placar.
- **Trocar**: troca os times de lado.

O placar e a configuração ficam salvos no aparelho. Enquanto o placar está aberto, a tela não apaga. Para instalar, use "Adicionar à tela inicial" no navegador; depois disso funciona também sem internet.

## Desenvolvimento

É HTML/CSS/JS puro, sem build. Para rodar localmente:

```bash
python -m http.server 8000
```

Publicação: GitHub Pages, a partir da branch `main` (raiz). O service worker busca sempre da rede e só usa o cache quando está offline. Se adicionar ou remover arquivos, atualize `ASSETS` e a versão de `CACHE` em `sw.js`.
