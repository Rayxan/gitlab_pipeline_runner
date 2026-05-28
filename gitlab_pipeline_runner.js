/**
 * GitLab Pipeline Auto-Runner (DevTools Console)
 * ================================================
 * Cole este código inteiro no console do DevTools (F12) enquanto estiver
 * na página do pipeline do GitLab. Ele vai disparar automaticamente todos
 * os jobs manuais assim que ficarem disponíveis.
 *
 * Como parar:
 *   clearInterval(window.__pipelineRunner)
 *
 * Como alterar o intervalo (padrão 10s):
 *   Mude a constante POLL_INTERVAL_MS antes de colar.
 */

(function () {
  const POLL_INTERVAL_MS = 10000; // intervalo de verificação em ms (10 segundos)

  // Guarda as chaves dos botões já clicados para não disparar duas vezes
  const clicked = new Set();

  // -------------------------------------------------------------------------
  // Utilitários de log com timestamp
  // -------------------------------------------------------------------------
  const log = {
    info:    (msg) => console.log( `%c[${ts()}] ℹ️  ${msg}`, "color: #6a9fd8"),
    success: (msg) => console.log( `%c[${ts()}] ✅ ${msg}`, "color: #4caf50; font-weight: bold"),
    warn:    (msg) => console.warn( `[${ts()}] ⚠️  ${msg}`),
    error:   (msg) => console.error(`[${ts()}] ❌ ${msg}`),
  };

  function ts() {
    return new Date().toLocaleTimeString("pt-BR");
  }

  // -------------------------------------------------------------------------
  // Lê o nome do job (div interno com title dentro do link de status)
  // -------------------------------------------------------------------------
  function getJobName(jobItem) {
    // O link ci-job-item-content tem title="manual action", mas dentro dele
    // há um <div title="nome-do-job"> com o nome real
    const nameEl = jobItem.querySelector(
      '[data-testid="ci-job-item-content"] [title]'
    );
    return nameEl ? nameEl.getAttribute("title") : "desconhecido";
  }

  // -------------------------------------------------------------------------
  // Descobre o nome do stage a partir do ancestral stage-column
  // -------------------------------------------------------------------------
  function getStageName(jobItem) {
    const stageCol = jobItem.closest('[data-testid="stage-column"]');
    if (!stageCol) return "?";
    const titleEl = stageCol.querySelector('[data-testid="stage-column-title"] span');
    return titleEl ? titleEl.textContent.trim() : "?";
  }

  // -------------------------------------------------------------------------
  // Retorna chave única para identificar o botão (evita duplo disparo)
  // -------------------------------------------------------------------------
  function getButtonKey(playBtn) {
    // O id contém o path do job, ex: js-ci-action-.../jobs/509224/play
    return playBtn.id || playBtn.closest('[data-testid="ci-job-item"]')?.id || Math.random();
  }

  // -------------------------------------------------------------------------
  // Retorna todos os jobs com botão "Run" disponível (prontos para disparar)
  // -------------------------------------------------------------------------
  function findManualJobs() {
    // Se o botão [title="Run"] existe no item é porque o job está aguardando
    // disparo manual — não precisamos checar o status separadamente.
    // NOTA: o title do link de status é "manual action" (não "manual"),
    //       por isso a versão anterior não encontrava os jobs.
    const jobItems = document.querySelectorAll('[data-testid="ci-job-item"]');
    const pending = [];

    for (const item of jobItems) {
      const playBtn = item.querySelector('[data-testid="ci-action-button"][title="Run"]');
      if (!playBtn) continue;

      const key = getButtonKey(playBtn);
      if (clicked.has(key)) continue;

      pending.push({ item, playBtn, key });
    }

    return pending;
  }

  // -------------------------------------------------------------------------
  // Verifica se o pipeline chegou ao fim (todos os jobs em estado terminal)
  // -------------------------------------------------------------------------
  function isPipelineFinished() {
    const allItems = document.querySelectorAll('[data-testid="ci-job-item"]');
    if (allItems.length === 0) return false;

    const terminalStatuses = new Set(["passed", "failed", "canceled", "skipped"]);

    for (const item of allItems) {
      const statusLink = item.querySelector('[data-testid="ci-job-item-content"]');
      if (!statusLink) continue;
      const status = (statusLink.getAttribute("title") || "").toLowerCase();
      if (!terminalStatuses.has(status)) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Tick principal: chamado a cada intervalo
  // -------------------------------------------------------------------------
  function tick() {
    const manualJobs = findManualJobs();

    if (manualJobs.length === 0) {
      if (isPipelineFinished()) {
        log.success("Pipeline finalizado! Encerrando o auto-runner.");
        clearInterval(window.__pipelineRunner);
        return;
      }
      log.info("Aguardando jobs manuais...");
      return;
    }

    for (const { item, playBtn, key } of manualJobs) {
      const name  = getJobName(item);
      const stage = getStageName(item);
      log.success(`Disparando [${stage}] → ${name}`);
      clicked.add(key);
      playBtn.click();
    }
  }

  // -------------------------------------------------------------------------
  // Inicialização
  // -------------------------------------------------------------------------
  console.log("%c🚀 GitLab Pipeline Auto-Runner iniciado!", "font-size:14px; font-weight:bold; color:#fc6d26");
  console.log(`%cPolling a cada ${POLL_INTERVAL_MS / 1000}s.  Para parar: clearInterval(window.__pipelineRunner)`, "color: #aaa");

  tick(); // executa imediatamente na primeira vez
  window.__pipelineRunner = setInterval(tick, POLL_INTERVAL_MS);
})();
