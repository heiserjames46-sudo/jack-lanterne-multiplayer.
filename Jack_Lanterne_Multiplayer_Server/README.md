# Jack Lanterne Multiplayer Server

Servidor WebSocket do multiplayer de Jack Lanterne: Reino das Abóboras.

## Requisitos

- Node.js 12 ou superior (Node 13.13.0 pode executar este código, mas é antigo e não deve ser usado para hospedar publicamente).
- npm.

## Executar localmente

Na pasta `Jack_Lanterne_Multiplayer_Server`:

```bat
npm install
npm start
```

O servidor usa `PORT` quando a hospedagem define essa variável; localmente, o padrão é 8080. Para parar, pressione `Ctrl+C`.

## Testes automatizados

```bat
npm test
```

A suíte verifica salas cooperativas para 4, 6 e 8 jogadores, limite de participantes, PvP Solo, movimento, aterrissagem numa plataforma enviada ao servidor e estados de parry/defesa. Os testes precisam da dependência `ws` instalada.

## Hospedagem

Para Render ou outro serviço Node.js compatível:

- Build command: `npm install`
- Start command: `npm start`
- Tipo de serviço: Web Service
- O serviço deve permitir conexões WebSocket e definir a porta por `PORT`.

Depois de publicar, configure no menu multiplayer do HTML a URL WebSocket (`wss://...`) fornecida pela hospedagem.

## Estado e limites conhecidos

- O anfitrião publica a geometria do mapa; o servidor simula movimento, gravidade, colisões com plataformas sincronizadas, temporização de armadilhas e projéteis em salas multiplayer.
- O servidor valida janelas de parry/defesa e aplica valores fixos de dano para ações reportadas.
- A IA completa de todos os chefes e todos os efeitos visuais/status ainda não foram transferidos integralmente para o servidor. Alguns ataques e efeitos continuam sendo calculados pelo cliente anfitrião.
- Testes automatizados não substituem teste visual em navegadores e dispositivos físicos. Teste real em PC e celular ainda é necessário.
- Não exponha publicamente uma instalação antiga do Node.js no Windows 7. Use hospedagem atualizada para o servidor online.
