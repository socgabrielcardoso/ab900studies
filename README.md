# 🤖 AB-900 Quest · Academia de Agentes

Plataforma independente (não afiliada à Microsoft) de microaprendizagem gamificada para **Microsoft 365 Certified: Copilot and Agent Administration Fundamentals (AB-900)**.

## Conteúdo e mecânicas
- 30 dias × 3 fases = **90 fases**: conectar pares, investigar cenários e decisão cronometrada.
- 120+ conceitos mapeados aos três domínios da matriz AB-900; casos práticos são originais, não questões oficiais.
- Trilha interativa, Guilherme/Camila/Chefe como personagens, som opcional, partículas, efeitos com canvas WebGL quando disponível.
- Progresso e anotações persistidos **localmente** no navegador, sem conta e sem servidor; exportação/importação JSON.
- Revisão espaçada (intervalos 1, 2, 4, 7, 14 dias) de erros e dificuldades, precisão por domínio, streak, loja de AITokens, vidas e skins.
- Design responsivo, teclado, controle de animações e modo de movimento reduzido.
- Simulado final e desafios recorrentes para consolidação.

## Fontes e escopo
[Guia oficial AB-900 da Microsoft](https://learn.microsoft.com/pt-br/credentials/certifications/resources/study-guides/ab-900) — objetivos medidos a partir de **14/10/2026**, enquanto a atualização da versão inglesa estava anunciada para essa data. Confira o guia mais recente antes da prova. Distribuição: Microsoft 365 30–35%; proteção e governança 35–40%; administração de Copilot e agentes 25–30%.

Não há promessa de aprovação nem simulação de conexão real ao tenant M365. Algumas funcionalidades da Microsoft variam conforme licenciamento e disponibilidade.

## Executar
Servidor estático, sem dependências: `python3 -m http.server 8080` e abra `http://localhost:8080`. No Vercel, use Framework Preset **Other**, Output Directory vazio. O arquivo `vercel.json` define cabeçalhos seguros.

## Privacidade
Sem analytics, trackers, APIs externas ou credenciais. Dados em localStorage do navegador e exportações voluntárias. Não use dados empresariais reais nas notas. Limpar armazenamento ou mudar de navegador pode remover o progresso se não houver backup.

## Qualidade
Estrutura simples e auditável: `index.html`, `src/content.js`, `src/app.js`, `src/styles.css`. Execute `node --check src/content.js && node --check src/app.js`.

Feito para estudar com consistência, não decorar respostas.
