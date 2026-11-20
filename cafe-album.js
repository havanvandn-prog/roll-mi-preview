// Marquee and large photo viewer adapted from the Tuyết Trương landing page.
(function () {
  const track = document.getElementById("photo-marquee-track");
  const marquee = document.querySelector(".photo-marquee");
  const lightbox = document.getElementById("gallery-lightbox");
  if (!track?.children.length || !marquee) return;

  const slides = [...track.children];
  const COUNT = slides.length;

  let loopWidth = 0;
  let offsetPx = 0;
  let lightboxIndex = 0;

  const lbImg = lightbox?.querySelector(".gallery-lightbox__img");
  const lbCap = lightbox?.querySelector(".gallery-lightbox__caption");

  slides.forEach(slide => {
    const copy = slide.cloneNode(true);
    copy.tabIndex = -1;
    copy.setAttribute("aria-hidden", "true");
    copy.firstElementChild.loading = "lazy";
    track.append(copy);
  });

  let motion;
  let inView = false;
  let returningFromLightbox = false;
  const SPEED = 90;
  function readOffset() {
    if (motion && loopWidth > 0) offsetPx = (Number(motion.currentTime || 0) * SPEED / 1000) % loopWidth;
  }
  function updatePlayback() {
    if (!motion) return;
    const paused = document.hidden || !inView || lightbox?.open ||
      marquee.classList.contains('is-paused');
    if (paused) motion.pause(); else if (motion.playState !== 'running') motion.play();
  }
  function measureLoop() {
    const nextWidth = track.children[COUNT].offsetLeft - track.firstElementChild.offsetLeft;
    if (nextWidth <= 0 || Math.abs(nextWidth - loopWidth) < .1) return;
    readOffset();
    const progress = loopWidth > 0 ? offsetPx / loopWidth : 0;
    loopWidth = nextWidth;
    offsetPx = progress * loopWidth;
    motion?.cancel();
    motion = track.animate([
      { transform: 'translate3d(0,0,0)' },
      { transform: `translate3d(${-loopWidth}px,0,0)` }
    ], { duration: loopWidth / SPEED * 1000, iterations: Infinity, easing: 'linear' });
    motion.currentTime = offsetPx / SPEED * 1000;
    updatePlayback();
  }
  function applyOffset() {
    if (motion) motion.currentTime = offsetPx / SPEED * 1000;
  }
  new IntersectionObserver(entries => {
    inView = entries.at(-1).isIntersecting;
    updatePlayback();
  }).observe(marquee);
  document.addEventListener('visibilitychange', updatePlayback);
  window.addEventListener('pageshow', updatePlayback);
  lightbox?.addEventListener('close', () => {
    // The dialog returns focus to its opener; that restoration is not a new keyboard interaction.
    returningFromLightbox = false;
    updatePlayback();
  });
  track.addEventListener('focusout', () => {
    requestAnimationFrame(updatePlayback);
  });

  let dragPending = false;
  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartOffset = 0;
  let pointerDownTarget = null;

  function releaseCapture(e) {
    if (!marquee.hasPointerCapture(e.pointerId)) return;
    try {
      marquee.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  function finishPointerInteraction(e) {
    if (!dragPending && !isDragging) return;
    const tap = e.type === "pointerup" && dragPending && !dragMoved;
    const slide = pointerDownTarget?.closest?.(".photo-marquee-slide[data-gallery-index]");
    isDragging = false;
    dragPending = false;
    dragMoved = false;
    pointerDownTarget = null;
    marquee.classList.remove("is-paused", "is-dragging");
    releaseCapture(e);
    updatePlayback();
    if (tap && slide) showLightbox(Number(slide.dataset.galleryIndex));
  }

  marquee.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    dragPending = true;
    isDragging = false;
    dragMoved = false;
    dragStartX = e.clientX;
    readOffset();
    dragStartOffset = offsetPx;
    pointerDownTarget = e.target;
    marquee.classList.add("is-paused");
    updatePlayback();
    try {
      marquee.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  marquee.addEventListener("pointermove", (e) => {
    if (!dragPending && !isDragging) return;
    const dx = e.clientX - dragStartX;
    if (!isDragging && Math.abs(dx) > 4) {
      isDragging = true;
      dragMoved = true;
      marquee.classList.add("is-dragging");
    }
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    offsetPx = dragStartOffset - dx;
    if (loopWidth > 0) offsetPx = ((offsetPx % loopWidth) + loopWidth) % loopWidth;
    applyOffset();
  });

  marquee.addEventListener("pointerup", finishPointerInteraction);
  marquee.addEventListener("pointercancel", finishPointerInteraction);
  marquee.addEventListener("lostpointercapture", (e) => {
    if (dragPending || isDragging) finishPointerInteraction(e);
  });

  track.addEventListener("load", measureLoop, true);
  const albumSize = new ResizeObserver(measureLoop);
  albumSize.observe(marquee);
  albumSize.observe(track);

  measureLoop();

  function showLightbox(index) {
    if (!lightbox || !lbImg) return;
    lightboxIndex = ((index - 1) % COUNT + COUNT) % COUNT;
    const photo = slides[lightboxIndex].firstElementChild;
    lbImg.src = photo.src;
    lbImg.alt = photo.alt;
    if (lbCap) lbCap.textContent = `${lightboxIndex + 1} / ${COUNT}`;
    if (!lightbox.open) {
      returningFromLightbox = true;
      lightbox.showModal();
    }
    updatePlayback();
  }

  track.addEventListener("click", (event) => {
    const slide = event.target.closest("[data-gallery-index]");
    if (event.detail === 0 && slide) showLightbox(Number(slide.dataset.galleryIndex));
  });

  track.addEventListener("focusin", (event) => {
    if (returningFromLightbox) return;
    const slide = event.target.closest("[data-gallery-index]");
    if (slide?.matches(":focus-visible")) {
      marquee.scrollLeft = 0;
      offsetPx = slide.offsetLeft % loopWidth;
      applyOffset();
      updatePlayback();
    }
  });

  function stepLightbox(delta) {
    showLightbox(lightboxIndex + 1 + delta);
  }

  document.querySelectorAll("[data-close-gallery-lightbox]").forEach((btn) => {
    btn.addEventListener("click", () => lightbox?.close());
  });

  lightbox?.querySelector("[data-gallery-prev]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    stepLightbox(-1);
  });

  lightbox?.querySelector("[data-gallery-next]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    stepLightbox(1);
  });

  lightbox?.addEventListener("cancel", (e) => {
    e.preventDefault();
    lightbox.close();
  });

  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox?.open) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepLightbox(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepLightbox(1);
    } else if (e.key === "Escape") {
      lightbox.close();
    }
  });
})();
