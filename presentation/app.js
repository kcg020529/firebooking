(() => {
  function setExposure(element, isExposed) {
    if (!element) return;
    element.hidden = !isExposed;
    element.setAttribute('aria-hidden', String(!isExposed));
  }

  function setScreenshotExposure(image, fallback, isImageExposed) {
    setExposure(image, isImageExposed);
    setExposure(fallback, !isImageExposed);
  }

  function buildFlowTimeline(scenes) {
    return scenes.flatMap((scene, sceneIndex) => scene.flowSteps.map((flowStep, flowIndex) => ({
      ...flowStep,
      sceneId: scene.id,
      sceneIndex,
      flowIndex,
    })));
  }

  function buildPacketMotion(path, {
    canvasWidth,
    canvasHeight,
    packetWidth,
    packetHeight,
    sampleCount = 18,
    viewBoxWidth = 900,
    viewBoxHeight = 720,
  }) {
    const pathLength = path.getTotalLength();
    const halfWidth = packetWidth / 2;
    const halfHeight = packetHeight / 2;

    return Array.from({ length: sampleCount }, (_, index) => {
      const offset = sampleCount === 1 ? 1 : index / (sampleCount - 1);
      const point = path.getPointAtLength(pathLength * offset);
      const scaledX = (point.x / viewBoxWidth) * canvasWidth;
      const scaledY = (point.y / viewBoxHeight) * canvasHeight;
      const left = Math.min(Math.max(scaledX, halfWidth), canvasWidth - halfWidth);
      const top = Math.min(Math.max(scaledY, halfHeight), canvasHeight - halfHeight);

      return { left: `${left}px`, top: `${top}px`, offset };
    });
  }

  function deriveFlowState(scene, flowIndex) {
    const boundedIndex = Math.min(Math.max(Number(flowIndex) || 0, 0), scene.flowSteps.length - 1);
    const currentStep = scene.flowSteps[boundedIndex];
    const completedSteps = scene.flowSteps.slice(0, boundedIndex);

    return {
      contextNodes: [...scene.activeNodes],
      contextEdges: [...scene.activeEdges],
      currentEdge: currentStep.edge,
      currentNodes: [currentStep.from, currentStep.to],
      completedEdges: completedSteps.map(({ edge }) => edge),
      completedNodes: [...new Set(completedSteps.flatMap(({ from, to }) => [from, to]))],
      flowingEdges: [currentStep.edge],
    };
  }

  function selectObservedScene(entries, steps, navigationTargetIndex = null) {
    if (Number.isInteger(navigationTargetIndex)) {
      const targetStep = steps[navigationTargetIndex];
      return entries.some((entry) => entry.target === targetStep && entry.isIntersecting)
        ? navigationTargetIndex
        : null;
    }

    const activeEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
    return activeEntry ? steps.indexOf(activeEntry.target) : null;
  }

  function createTimelineTriggers(documentRef, scenes, timeline) {
    const sections = [...documentRef.querySelectorAll('[data-scene-step]')];
    const sectionBySceneId = new Map(sections.map((section) => [section.dataset.sceneStep, section]));

    return timeline.map((entry, timelineIndex) => {
      const trigger = documentRef.createElement('span');
      trigger.className = 'timeline-trigger';
      trigger.dataset.timelineStep = String(timelineIndex);
      trigger.dataset.sceneIndex = String(entry.sceneIndex);
      trigger.dataset.flowIndex = String(entry.flowIndex);
      trigger.setAttribute('aria-hidden', 'true');
      sectionBySceneId.get(scenes[entry.sceneIndex].id)?.append(trigger);
      return trigger;
    });
  }

  /** 한 장면 안에서 쓰는 스크린샷 목록 (등장 순서, 중복 제거). */
  function listSceneScreenshots(scene) {
    return [...new Set(scene.flowSteps.map(({ screenshot }) => screenshot).filter(Boolean))];
  }

  function createPresentationController({ document: documentRef, window: windowRef, scenes }) {
    const root = documentRef.documentElement;
    const stage = documentRef.querySelector('#presentation-stage');
    const sceneSections = [...documentRef.querySelectorAll('[data-scene-step]')];
    const timeline = buildFlowTimeline(scenes);
    const timelineSteps = createTimelineTriggers(documentRef, scenes, timeline);
    const chapter = documentRef.querySelector('#current-chapter');
    const sceneEyebrow = documentRef.querySelector('#scene-eyebrow');
    const title = documentRef.querySelector('#scene-title');
    const summary = documentRef.querySelector('#scene-summary');
    const rule = documentRef.querySelector('#scene-rule');
    const image = documentRef.querySelector('#screen-image');
    const fallback = documentRef.querySelector('#screen-fallback');
    const caption = documentRef.querySelector('#screen-caption');
    const fallbackPanels = [...documentRef.querySelectorAll('[data-fallback-scene]')];
    const graphNodes = [...documentRef.querySelectorAll('[data-node]')];
    const graphEdges = [...documentRef.querySelectorAll('[data-edge]')];
    const nodeById = new Map(graphNodes.map((node) => [node.dataset.node, node]));
    const edgeById = new Map(graphEdges.map((edge) => [edge.dataset.edge, edge]));
    const flowCanvas = documentRef.querySelector('.graph-stage');
    const packetMarker = documentRef.querySelector('#packet-marker');
    const packetCount = documentRef.querySelector('#packet-count');
    const packetLabel = documentRef.querySelector('#packet-label');
    const packetRaw = documentRef.querySelector('#packet-raw');
    const packetProcess = documentRef.querySelector('#packet-process');
    const packetOutput = documentRef.querySelector('#packet-output');
    const progress = documentRef.querySelector('#progress-bar');
    const reducedMotionQuery = windowRef.matchMedia('(prefers-reduced-motion: reduce)');
    let activeSceneIndex = -1;
    let activeTimelineIndex = -1;
    let navigationTargetIndex = null;
    let currentScreenshot = null;

    // 스크롤할 때 화면이 비지 않도록 발표에 쓰는 스크린샷을 미리 받아 둔다.
    [...new Set(timeline.map(({ screenshot }) => screenshot).filter(Boolean))].forEach((src) => {
      const preload = new windowRef.Image();
      preload.src = src;
    });

    function clampTimelineIndex(index) {
      return Math.min(Math.max(Number(index) || 0, 0), timeline.length - 1);
    }

    function clampSceneIndex(index) {
      return Math.min(Math.max(Number(index) || 0, 0), scenes.length - 1);
    }

    /** 스크린샷이 없는 장면은 소개 패널, 스크린샷을 못 읽으면 안내 패널을 보여준다. */
    function showFallback(scene) {
      const panelId = listSceneScreenshots(scene).length > 0 ? 'missing' : scene.id;
      fallbackPanels.forEach((panel) => {
        const isActive = panel.dataset.fallbackScene === panelId;
        panel.classList.toggle('is-active', isActive);
        setExposure(panel, isActive);
      });
      setScreenshotExposure(image, fallback, false);
      fallback.setAttribute('aria-label', `${scene.title} 설명 화면`);
    }

    function setScreenshot(scene, flowStep) {
      const screenshots = listSceneScreenshots(scene);
      const src = flowStep.screenshot ?? null;

      if (!src) {
        currentScreenshot = null;
        caption.textContent = '';
        showFallback(scene);
        return;
      }

      caption.textContent = screenshots.length > 1
        ? `화면 ${screenshots.indexOf(src) + 1} / ${screenshots.length}`
        : '';
      image.alt = `${scene.title} — ${flowStep.label} 화면`;
      if (src === currentScreenshot) return;

      // 새 이미지가 뜰 때까지 이전 스크린샷을 그대로 둬 깜빡이지 않게 한다.
      currentScreenshot = src;
      image.src = src;
      if (image.complete && image.naturalWidth > 0) setScreenshotExposure(image, fallback, true);
    }

    function setPacketPosition(flowStep) {
      const fromNode = nodeById.get(flowStep.from);
      const toNode = nodeById.get(flowStep.to);
      const edge = edgeById.get(flowStep.edge);
      if (!fromNode || !toNode || !packetMarker) return;

      packetMarker.style.setProperty('--packet-from-x', `${(Number(fromNode.dataset.x) / 900) * 100}%`);
      packetMarker.style.setProperty('--packet-from-y', `${(Number(fromNode.dataset.y) / 720) * 100}%`);
      packetMarker.style.setProperty('--packet-to-x', `${(Number(toNode.dataset.x) / 900) * 100}%`);
      packetMarker.style.setProperty('--packet-to-y', `${(Number(toNode.dataset.y) / 720) * 100}%`);
      packetMarker.classList.remove('is-moving', 'is-settled');

      const canFollowPath = edge
        && flowCanvas
        && typeof edge.getTotalLength === 'function'
        && typeof packetMarker.animate === 'function';
      if (!canFollowPath) {
        void packetMarker.offsetWidth;
        packetMarker.classList.add(reducedMotionQuery.matches ? 'is-settled' : 'is-moving');
        return;
      }

      const frames = buildPacketMotion(edge, {
        canvasWidth: flowCanvas.clientWidth,
        canvasHeight: flowCanvas.clientHeight,
        packetWidth: packetMarker.offsetWidth,
        packetHeight: packetMarker.offsetHeight,
      });
      const finalFrame = frames.at(-1);
      packetMarker.getAnimations().forEach((animation) => animation.cancel());
      packetMarker.style.left = finalFrame.left;
      packetMarker.style.top = finalFrame.top;

      if (!reducedMotionQuery.matches) {
        packetMarker.animate(frames, {
          duration: 900,
          easing: 'cubic-bezier(.3, .7, .3, 1)',
        });
      }
    }

    function setSceneMetadata(scene, sceneIndex) {
      chapter.textContent = scene.eyebrow;
      sceneEyebrow.textContent = scene.eyebrow;
      title.textContent = scene.title;
      summary.textContent = scene.summary;
      rule.textContent = scene.rule;
      stage.dataset.status = scene.status;

      sceneSections.forEach((section, sectionIndex) => {
        const isActive = section.dataset.sceneStep === scenes[sceneIndex].id;
        section.classList.toggle('is-active', isActive);
        if (isActive) section.setAttribute('aria-current', 'step');
        else section.removeAttribute('aria-current');
      });
    }

    function setTimelineStep(index) {
      if (!timeline.length) return;

      const nextIndex = clampTimelineIndex(index);
      if (nextIndex === activeTimelineIndex) return;

      const entry = timeline[nextIndex];
      const scene = scenes[entry.sceneIndex];
      const flowState = deriveFlowState(scene, entry.flowIndex);
      const contextNodes = new Set(flowState.contextNodes);
      const contextEdges = new Set(flowState.contextEdges);
      const currentNodes = new Set(flowState.currentNodes);
      const completedNodes = new Set(flowState.completedNodes);
      const completedEdges = new Set(flowState.completedEdges);
      activeTimelineIndex = nextIndex;

      if (entry.sceneIndex !== activeSceneIndex) {
        activeSceneIndex = entry.sceneIndex;
        setSceneMetadata(scene, entry.sceneIndex);
      }
      setScreenshot(scene, entry);

      timelineSteps.forEach((step, stepIndex) => {
        if (stepIndex === nextIndex) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });

      graphNodes.forEach((node) => {
        const nodeId = node.dataset.node;
        node.classList.toggle('is-context', contextNodes.has(nodeId));
        node.classList.toggle('is-complete', completedNodes.has(nodeId) && !currentNodes.has(nodeId));
        node.classList.toggle('is-active', currentNodes.has(nodeId));
        node.classList.toggle('is-muted', !contextNodes.has(nodeId));
      });

      graphEdges.forEach((edge) => {
        const edgeId = edge.dataset.edge;
        const isCurrent = edgeId === flowState.currentEdge;
        edge.classList.toggle('is-context', contextEdges.has(edgeId));
        edge.classList.toggle('is-complete', completedEdges.has(edgeId) && !isCurrent);
        edge.classList.toggle('is-active', isCurrent);
        edge.classList.toggle('is-flowing', isCurrent);
        edge.classList.toggle('is-muted', !contextEdges.has(edgeId));
      });

      packetCount.textContent = `${entry.flowIndex + 1} / ${scene.flowSteps.length} 단계`;
      packetLabel.textContent = entry.label;
      packetRaw.textContent = entry.raw;
      packetProcess.textContent = entry.process;
      packetOutput.textContent = entry.output;
      setPacketPosition(entry);

      progress.style.width = `${((nextIndex + 1) / timeline.length) * 100}%`;
      root.dataset.scene = scene.id;
      root.dataset.flowStep = String(entry.flowIndex + 1);
    }

    function setScene(index) {
      if (!scenes.length) return;
      const sceneIndex = clampSceneIndex(index);
      const firstTimelineIndex = timeline.findIndex((entry) => entry.sceneIndex === sceneIndex);
      setTimelineStep(firstTimelineIndex);
    }

    function goToTimelineStep(index) {
      if (!timeline.length) return;
      const nextIndex = clampTimelineIndex(index);
      navigationTargetIndex = nextIndex;
      setTimelineStep(nextIndex);
      timelineSteps[nextIndex]?.scrollIntoView({
        behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
        block: 'center',
      });
    }

    function goToScene(index) {
      if (!scenes.length) return;
      const sceneIndex = clampSceneIndex(index);
      const firstTimelineIndex = timeline.findIndex((entry) => entry.sceneIndex === sceneIndex);
      goToTimelineStep(firstTimelineIndex);
    }

    image.addEventListener('load', () => {
      if (currentScreenshot && image.getAttribute('src') === currentScreenshot) {
        setScreenshotExposure(image, fallback, true);
      }
    });

    image.addEventListener('error', () => {
      const scene = scenes[activeSceneIndex];
      if (scene && currentScreenshot) showFallback(scene);
    });

    // ── 스크린샷 확대 보기 ──
    // 발표 화면에서 작은 글씨를 보여줄 때 쓴다. 열려 있는 동안 페이지 스크롤과
    // 방향키 단계 이동을 막아, 확대해서 설명하다 발표 흐름이 넘어가지 않게 한다.
    const lightbox = documentRef.querySelector('#lightbox');
    const lightboxImage = documentRef.querySelector('#lightbox-image');
    const lightboxTitle = documentRef.querySelector('#lightbox-title');
    const lightboxClose = documentRef.querySelector('#lightbox-close');

    function openLightbox() {
      if (!lightbox || !currentScreenshot || image.hidden) return;
      lightboxImage.src = currentScreenshot;
      lightboxImage.alt = image.alt;
      lightboxTitle.textContent = `${scenes[activeSceneIndex]?.eyebrow ?? ''} · ${packetLabel.textContent}`;
      lightbox.classList.remove('is-actual-size');
      root.classList.add('is-lightbox-open');
      lightbox.showModal();
    }

    if (lightbox) {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', '스크린샷 크게 보기');
      image.addEventListener('click', openLightbox);
      image.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openLightbox();
      });

      lightboxClose.addEventListener('click', () => lightbox.close());
      lightbox.addEventListener('close', () => root.classList.remove('is-lightbox-open'));
      // 사진 바깥(어두운 배경)을 누르면 닫고, 사진을 누르면 화면 맞춤 ↔ 원본 크기를 바꾼다.
      lightbox.addEventListener('click', (event) => {
        if (event.target === lightboxImage) {
          lightbox.classList.toggle('is-actual-size');
          return;
        }
        if (!event.target.closest('.lightbox-bar')) lightbox.close();
      });
    }

    if ('IntersectionObserver' in windowRef) {
      const observer = new windowRef.IntersectionObserver((entries) => {
        const nextIndex = selectObservedScene(entries, timelineSteps, navigationTargetIndex);
        if (nextIndex === null) return;
        if (nextIndex === navigationTargetIndex) navigationTargetIndex = null;
        setTimelineStep(nextIndex);
      }, {
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0,
      });

      timelineSteps.forEach((step) => observer.observe(step));
    }

    documentRef.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (root.classList.contains('is-lightbox-open')) return;
      if (event.target instanceof windowRef.HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;

      const nextByKey = {
        ArrowDown: activeTimelineIndex + 1,
        ArrowRight: activeTimelineIndex + 1,
        PageDown: activeTimelineIndex + 1,
        ArrowUp: activeTimelineIndex - 1,
        ArrowLeft: activeTimelineIndex - 1,
        PageUp: activeTimelineIndex - 1,
        Home: 0,
        End: timeline.length - 1,
      };

      if (!(event.key in nextByKey)) return;
      event.preventDefault();
      goToTimelineStep(nextByKey[event.key]);
    });

    setTimelineStep(0);
    return { goToScene, goToTimelineStep, setScene, setTimelineStep };
  }

  const presentationApi = Object.freeze({
    buildPacketMotion,
    buildFlowTimeline,
    createPresentationController,
    deriveFlowState,
    selectObservedScene,
    setExposure,
    setScreenshotExposure,
  });
  globalThis.FIREBOOKING_PRESENTATION = presentationApi;

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  document.documentElement.classList.add('is-enhanced');
  const controller = createPresentationController({
    document,
    window,
    scenes: globalThis.FIREBOOKING_SCENES ?? [],
  });
  window.setScene = controller.setScene;
  window.goToScene = controller.goToScene;
  window.setTimelineStep = controller.setTimelineStep;
})();
