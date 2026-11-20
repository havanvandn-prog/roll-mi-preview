(() => {
  const section = document.querySelector(".rollmi-reviews");
  const dialog = document.getElementById("review-viewer");
  if (!section || !dialog) return;

  const track = section.querySelector(".review-track");
  const cards = [...track.querySelectorAll(".review-card")];
  if (!cards.length) return;

  const dots = section.querySelector(".review-dots");
  const previousPage = section.querySelector('[data-review-page="previous"]');
  const nextPage = section.querySelector('[data-review-page="next"]');
  const previousReview = dialog.querySelector('[data-viewer-step="previous"]');
  const nextReview = dialog.querySelector('[data-viewer-step="next"]');
  const close = dialog.querySelector("[data-review-close]");
  const viewerCopy = dialog.querySelector(".review-viewer-copy");
  const viewerContent = dialog.querySelector(".review-viewer-content");
  const viewerName = dialog.querySelector("#review-viewer-name");
  const viewerAvatar = dialog.querySelector("[data-viewer-avatar]");
  const viewerPlatform = dialog.querySelector("[data-viewer-platform]");
  const viewerStars = dialog.querySelector("[data-viewer-stars]");
  const viewerQuote = dialog.querySelector("[data-viewer-quote]");
  const viewerSummary = dialog.querySelector("[data-viewer-summary]");
  const viewerImage = dialog.querySelector("[data-viewer-image]");
  const viewerEmpty = dialog.querySelector("[data-viewer-empty]");
  const viewerThumbs = dialog.querySelector(".review-viewer-thumbs");
  const viewerCounter = dialog.querySelector("[data-viewer-counter]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  let pageOffsets = [];
  let pageIndex = 0;
  let reviewIndex = 0;
  let opener;

  const reviews = cards.map(card => ({
    name: card.querySelector(".review-name"),
    avatar: card.querySelector(".review-avatar"),
    platform: card.querySelector(".review-platform"),
    stars: card.querySelector(".review-stars"),
    quote: card.querySelector(".review-quote"),
    more: card.querySelector("[data-review-open]"),
    photos: [...card.querySelectorAll("[data-review-photo]")]
  }));

  function syncPage() {
    if (!pageOffsets.length) return;
    pageIndex = pageOffsets.reduce((nearest, offset, index) =>
      Math.abs(offset - track.scrollLeft) < Math.abs(pageOffsets[nearest] - track.scrollLeft) ? index : nearest
    , 0);
    previousPage.disabled = track.scrollLeft <= 2;
    nextPage.disabled = track.scrollWidth - track.clientWidth - track.scrollLeft <= 2;
    [...dots.children].forEach((button, index) => {
      if (index === pageIndex) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function goToPage(index) {
    track.scrollTo({ left: pageOffsets[index], behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  function syncLayout() {
    const columns = Number(getComputedStyle(section).getPropertyValue("--review-columns"));
    const maxOffset = track.scrollWidth - track.clientWidth;
    pageOffsets = cards.filter((_, index) => index % columns === 0).map(card =>
      Math.min(card.offsetLeft - cards[0].offsetLeft, maxOffset)
    );
    if (dots.children.length !== pageOffsets.length) {
      dots.replaceChildren(...pageOffsets.map((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "review-dot";
        dot.setAttribute("aria-label", `Review page ${index + 1}`);
        dot.addEventListener("click", () => goToPage(index));
        return dot;
      }));
    }
    dots.hidden = pageOffsets.length < 2;
    previousPage.hidden = nextPage.hidden = pageOffsets.length < 2;
    reviews.forEach(({ quote, more }) => {
      more.hidden = quote.scrollHeight <= quote.clientHeight + 1;
    });
    syncPage();
  }

  function stepPage(direction) {
    const target = direction > 0
      ? pageOffsets.find(offset => offset > track.scrollLeft + 2)
      : pageOffsets.findLast(offset => offset < track.scrollLeft - 2);
    if (target !== undefined) goToPage(pageOffsets.indexOf(target));
  }

  function selectPhoto(photoIndex) {
    const imageLink = reviews[reviewIndex].photos[photoIndex];
    viewerImage.hidden = !imageLink;
    viewerEmpty.hidden = Boolean(imageLink);
    if (imageLink) {
      viewerImage.src = imageLink.href;
      viewerImage.alt = imageLink.querySelector("img").alt;
    } else {
      viewerImage.removeAttribute("src");
      viewerImage.alt = "";
    }
    [...viewerThumbs.children].forEach((button, index) => {
      button.setAttribute("aria-pressed", String(photoIndex === index));
    });
  }

  function showReview(index, photoIndex = 0) {
    reviewIndex = (index + reviews.length) % reviews.length;
    const review = reviews[reviewIndex];
    viewerName.textContent = review.name.textContent;
    viewerAvatar.replaceChildren(...[...review.avatar.childNodes].map(node => node.cloneNode(true)));
    viewerAvatar.style.backgroundColor = getComputedStyle(review.avatar).backgroundColor;
    viewerPlatform.src = review.platform.src;
    viewerPlatform.alt = review.platform.alt;
    viewerStars.replaceChildren(...[...review.stars.childNodes].map(node => node.cloneNode(true)));
    viewerStars.setAttribute("aria-label", review.stars.getAttribute("aria-label"));
    viewerQuote.textContent = review.quote.textContent.trim();
    viewerSummary.hidden = !review.quote.hasAttribute("data-review-summary");
    viewerCounter.textContent = `${reviewIndex + 1} / ${reviews.length}`;
    viewerThumbs.replaceChildren(...review.photos.map((photo, photoIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `Show photo ${photoIndex + 1}`);
      const thumb = photo.querySelector("img").cloneNode();
      thumb.alt = "";
      button.append(thumb);
      button.addEventListener("click", () => selectPhoto(photoIndex));
      return button;
    }));
    selectPhoto(photoIndex);
    viewerCopy.scrollTop = 0;
    viewerContent.scrollTop = 0;
  }

  function openReview(index, photoIndex, trigger) {
    opener = trigger;
    showReview(index, photoIndex);
    dialog.showModal();
  }

  reviews.forEach((review, index) => {
    review.more.addEventListener("click", () => openReview(index, 0, review.more));
    review.photos.forEach((photo, photoIndex) => {
      photo.hidden = photoIndex >= 3;
      photo.addEventListener("click", event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openReview(index, photoIndex, photo);
      });
    });
    if (review.photos.length > 3) {
      review.photos[2].dataset.extra = `+${review.photos.length - 3}`;
      review.photos[2].setAttribute("aria-label", `Open photo gallery by ${review.name.textContent}`);
    }
  });

  previousPage.addEventListener("click", () => stepPage(-1));
  nextPage.addEventListener("click", () => stepPage(1));
  track.addEventListener("scroll", syncPage, { passive: true });
  const observer = new ResizeObserver(syncLayout);
  observer.observe(track);
  reviews.forEach(({ quote }) => observer.observe(quote));
  document.fonts.ready.then(syncLayout);
  syncLayout();

  previousReview.disabled = nextReview.disabled = reviews.length < 2;
  previousReview.addEventListener("click", () => showReview(reviewIndex - 1));
  nextReview.addEventListener("click", () => showReview(reviewIndex + 1));
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showReview(reviewIndex + (event.key === "ArrowRight" ? 1 : -1));
  });
})();
