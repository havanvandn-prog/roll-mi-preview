function setupSignatureCarousel(signatureMenu) {
  const viewport = signatureMenu.querySelector(".signature-viewport");
  const slides = [...signatureMenu.querySelectorAll(".signature-slide")];
  const arrows = [...signatureMenu.querySelectorAll(".signature-arrow")];
  const arrowGroup = signatureMenu.querySelector(".signature-arrows");
  const status = signatureMenu.querySelector(".signature-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let requested = null;
  let scrollTimer;

  function snapPoints() {
    const end = viewport.scrollWidth - viewport.clientWidth;
    if (end <= 0) return [{ left: 0, slide: 0 }];

    // At the end, keep the last image flush with the viewport instead of adding empty track space.
    const start = slides[0].offsetLeft;
    const points = slides.map((slide, index) => ({ left: slide.offsetLeft - start, slide: index }));
    return [...points.filter(point => point.left < end), { left: end, slide: slides.length - 1 }];
  }

  function nearestPoint(points, left) {
    return points.reduce((nearest, point, index) => (
      Math.abs(point.left - left) < Math.abs(points[nearest].left - left) ? index : nearest
    ), 0);
  }

  function goTo(key) {
    const points = snapPoints();
    const current = nearestPoint(points, requested ?? viewport.scrollLeft);
    const next = keyTargets[key](current, points.length);
    const target = (next + points.length) % points.length;
    if (target === current) return;
    const wraps = next !== target;
    requested = points[target].left;
    viewport.scrollTo({ left: requested, behavior: wraps || reducedMotion.matches ? "auto" : "smooth" });
  }

  const keyTargets = {
    ArrowLeft: current => current - 1,
    ArrowRight: current => current + 1,
    Home: () => 0,
    End: (_, count) => count - 1,
  };
  arrows.forEach(arrow => {
    arrow.addEventListener("click", () => goTo(arrow.dataset.direction === "1" ? "ArrowRight" : "ArrowLeft"));
  });
  viewport.addEventListener("keydown", event => {
    if (!Object.hasOwn(keyTargets, event.key) ||
        event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    goTo(event.key);
  });

  function finishScrolling() {
    requested = null;
    const points = snapPoints();
    const { slide: index } = points[nearestPoint(points, viewport.scrollLeft)];
    const title = slides[index].querySelector("h3").textContent.trim();
    const message = `${index + 1} of ${slides.length}: ${title}`;
    if (status.textContent !== message) status.textContent = message;
  }

  viewport.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(finishScrolling, 120);
  }, { passive: true });

  signatureMenu.dataset.carouselReady = "";
  new ResizeObserver(() => {
    requested = null;
    arrowGroup.hidden = viewport.scrollWidth <= viewport.clientWidth;
  }).observe(viewport);
}

function setupSignatureLightbox(gallery) {
  const dialog = gallery.querySelector(".signature-lightbox");
  const links = [...gallery.querySelectorAll(".signature-photo-link")];
  const frame = dialog.querySelector(".signature-lightbox-frame");
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector(".signature-lightbox-caption");
  let active = 0;
  let opener;

  function showPhoto(index) {
    active = (index + links.length) % links.length;
    const link = links[active];
    const thumbnail = link.querySelector("img");
    frame.style.setProperty("--photo-ratio", thumbnail.getAttribute("width") + " / " + thumbnail.getAttribute("height"));
    image.alt = thumbnail.alt;
    image.src = link.href;
    const title = link.closest(".signature-slide").querySelector("h3").textContent.trim();
    caption.textContent = `${title} · ${active + 1} / ${links.length}`;
  }

  links.forEach((link, index) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      opener = link;
      showPhoto(index);
      dialog.showModal();
    });
  });

  dialog.querySelector(".signature-lightbox-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".signature-lightbox-prev").addEventListener("click", () => showPhoto(active - 1));
  dialog.querySelector(".signature-lightbox-next").addEventListener("click", () => showPhoto(active + 1));
  dialog.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    showPhoto(active + (event.key === "ArrowLeft" ? -1 : 1));
  });
  dialog.addEventListener("close", () => opener.focus({ preventScroll: true }));
}

document.querySelectorAll(".signature-menu").forEach(menu => {
  setupSignatureCarousel(menu);
  setupSignatureLightbox(menu);
});
