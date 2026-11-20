(() => {
  const section = document.querySelector("#drinks.beverages");
  if (!section) return;

  const list = section.querySelector(".beverage-list");
  const choices = [...list.querySelectorAll("[data-drink]")];
  const gallery = section.querySelector(".beverage-gallery");
  const rail = section.querySelector(".beverage-rail");
  const scene = section.querySelector(".beverage-scene");
  const display = scene.querySelector(".beverage-display");
  const cup = section.querySelector(".beverage-cup");
  const cupImage = cup.querySelector("img");
  const props = section.querySelector(".beverage-props");
  const shadow = section.querySelector(".beverage-shadow");
  const badge = section.querySelector(".beverage-badge");
  const title = section.querySelector(".beverage-description h3");
  const description = section.querySelector(".beverage-description p");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const sideBySide = matchMedia("(min-width: 768px)");
  const assetBase = new URL("./assets/beverages/", document.baseURI);
  const cache = new Map();
  const animations = new Set();
  let active = 0;
  let desired = 0;
  let request = 0;

  function syncControlOrder() {
    if ((list.nextElementSibling === gallery) === sideBySide.matches) return;
    const focused = document.activeElement;
    if (sideBySide.matches) list.after(gallery);
    else list.before(gallery);
    if (gallery.contains(focused)) focused.focus({ preventScroll: true });
  }

  sideBySide.addEventListener("change", syncControlOrder);
  syncControlOrder();

  function alignDisplay() {
    if (!sideBySide.matches) {
      display.style.removeProperty("--beverage-display-offset");
      return;
    }
    const cupStyle = getComputedStyle(cup);
    const referenceRatio = Number(cupStyle.getPropertyValue("--glass-reference-ratio"));
    const referenceHeight = Math.min(cup.clientHeight, cup.clientWidth / referenceRatio) * (Number(cupStyle.scale) || 1);
    const referenceTop = cup.offsetTop + cup.offsetHeight - referenceHeight;
    const displayCenter = (referenceTop + props.offsetTop + props.offsetHeight) / 2;
    const menu = list.getBoundingClientRect();
    const menuCenter = menu.top + menu.height / 2 - scene.getBoundingClientRect().top;
    display.style.setProperty("--beverage-display-offset", `${menuCenter - displayCenter}px`);
  }

  const layoutObserver = new ResizeObserver(alignDisplay);
  layoutObserver.observe(section.querySelector(".beverage-intro"));
  layoutObserver.observe(scene);
  layoutObserver.observe(list);
  sideBySide.addEventListener("change", alignDisplay);
  alignDisplay();

  const drinks = choices.map((choice) => {
    const { drink, description } = choice.dataset;
    return {
      id: drink,
      name: choice.querySelector("strong").textContent,
      description,
      cup: new URL(drink + ".webp", assetBase).href,
      props: new URL(drink + "-ingredients.webp", assetBase).href,
      thumbnail: new URL(drink + "-thumb.webp", assetBase).href,
    };
  });

  const thumbnails = drinks.map((drink, index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    const label = document.createElement("span");

    button.type = "button";
    button.className = "beverage-thumbnail";
    button.dataset.drink = drink.id;
    button.setAttribute("aria-controls", "beverage-showcase");
    button.setAttribute("aria-pressed", String(index === active));
    image.src = drink.thumbnail;
    image.width = 180;
    image.height = 218;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    label.textContent = drink.name;
    button.append(image, label);
    button.addEventListener("click", () => select(index));
    return button;
  });
  rail.append(...thumbnails);
  gallery.hidden = false;

  function prepare(url) {
    if (!cache.has(url)) {
      const image = new Image();
      image.src = url;
      cache.set(url, image.decode().then(() => image, () => {
        cache.delete(url);
        return null;
      }));
    }
    return cache.get(url);
  }

  function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.then(() => {
      if (options.fill !== "forwards") animations.delete(animation);
    }, () => animations.delete(animation));
    return animation;
  }

  function trackThumbnail(index) {
    const thumb = thumbnails[index];
    const visible = rail.getBoundingClientRect();
    const target = thumb.getBoundingClientRect();
    const first = thumbnails[0].getBoundingClientRect();
    const step = thumbnails[1].getBoundingClientRect().left - first.left;
    const count = Math.max(1, Math.round(visible.width / step));
    const current = Math.round((visible.left - first.left) / step);
    if (target.left >= visible.left - 1 && target.right <= visible.right + 1) return;

    const start = index < current ? index : index - count + 1;
    rail.scrollTo({ left: start * step, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  async function select(index) {
    if (index === desired) {
      trackThumbnail(index);
      return;
    }
    desired = index;
    const token = ++request;
    for (const animation of animations) animation.cancel();
    animations.clear();
    if (index === active) {
      trackThumbnail(index);
      return;
    }

    const drink = drinks[index];
    const [image, garnish] = await Promise.all([prepare(drink.cup), prepare(drink.props)]);
    if (token !== request) return;
    if (!image) {
      desired = active;
      return;
    }

    const motion = !reducedMotion.matches;
    const oldGarnish = props.lastElementChild;
    const easeOut = "cubic-bezier(.2,.72,.3,1)";
    if (motion) {
      const exit = animate(cup, [
        { opacity: 1, transform: "translateX(0) scale(1)" },
        { opacity: 0, transform: "translateX(-18px) scale(.94)" },
      ], { duration: 120, easing: "ease-in", fill: "forwards" });
      try {
        await exit.finished;
      } catch {
        return;
      }
      if (token !== request) return;
      exit.cancel();
      animations.delete(exit);
    }

    cupImage.src = drink.cup;
    scene.dataset.drink = drink.id;
    title.textContent = drink.name;
    description.textContent = drink.description;
    active = index;
    choices.forEach((choice, position) => {
      const current = String(position === index);
      choice.setAttribute("aria-pressed", current);
      thumbnails[position].setAttribute("aria-pressed", current);
    });
    trackThumbnail(index);

    if (garnish) {
      garnish.alt = "";
      props.replaceChildren(...(motion && oldGarnish ? [oldGarnish, garnish] : [garnish]));
    } else {
      props.replaceChildren();
    }

    if (!motion) return;
    animate(cup, [
      { opacity: 0, transform: "translateY(25px) scale(.94)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ], { duration: 200, easing: easeOut });

    const fade = [{ opacity: 0 }, { opacity: 1 }];
    const fadeUp = [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }];
    animate(badge, fade, { duration: 155, delay: 125, fill: "backwards", easing: easeOut });
    animate(title, fadeUp, { duration: 160, delay: 145, fill: "backwards", easing: easeOut });
    animate(description, fadeUp, { duration: 170, delay: 175, fill: "backwards", easing: easeOut });
    animate(shadow, [{ opacity: 0.25 }, { opacity: 1 }], { duration: 190, delay: 225, fill: "backwards", easing: easeOut });

    if (garnish) {
      animate(garnish, fade, { duration: 185, delay: 200, fill: "backwards", easing: easeOut });
      if (oldGarnish && oldGarnish !== garnish) {
        const clearOld = () => oldGarnish.remove();
        animate(oldGarnish, [{ opacity: 1 }, { opacity: 0 }], { duration: 185, delay: 200, easing: easeOut }).finished.then(clearOld, clearOld);
      }
    }
  }

  function move(step) {
    const index = (desired + step + drinks.length) % drinks.length;
    select(index);
    return index;
  }

  choices.forEach((choice, index) => choice.addEventListener("click", () => select(index)));
  for (const button of gallery.querySelectorAll("[data-step]")) {
    button.addEventListener("click", () => move(Number(button.dataset.step)));
  }
  for (const [group, buttons] of [[list, choices], [rail, thumbnails]]) {
    group.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = move(event.key === "ArrowLeft" ? -1 : 1);
      buttons[index].focus({ preventScroll: true });
      if (group === rail) trackThumbnail(index);
    });
  }

  if (matchMedia("(width >= 1150px)").matches) rail.scrollLeft = thumbnails[1].offsetLeft - thumbnails[0].offsetLeft;
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      for (const drink of drinks) {
        prepare(drink.cup);
        prepare(drink.props);
      }
      observer.disconnect();
    }, { rootMargin: "0px 0px 160px" });
    observer.observe(section);
  }
})();
