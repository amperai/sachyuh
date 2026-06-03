const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

function activateTab(tab) {
  const target = tab.dataset.tab;

  tabs.forEach((item) => {
    const isActive = item === tab;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-selected', String(isActive));
    item.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    const isActive = panel.id === `panel-${target}`;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });

  if (location.hash !== `#${target}`) {
    history.replaceState(null, '', `#${target}`);
  }
}

function activateFromHash() {
  const hash = location.hash.replace('#', '');
  const tab = tabs.find((item) => item.dataset.tab === hash);

  if (tab) {
    activateTab(tab);
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event) => {
    const currentIndex = tabs.indexOf(tab);
    const lastIndex = tabs.length - 1;
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    }
  });

  tab.tabIndex = index === 0 ? 0 : -1;
});

document.querySelectorAll('[data-open-tab]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const tab = tabs.find((item) => item.dataset.tab === link.dataset.openTab);

    if (tab) {
      event.preventDefault();
      activateTab(tab);
      document.getElementById('tabs-title').scrollIntoView({ block: 'start' });
    }
  });
});

window.addEventListener('hashchange', activateFromHash);
activateFromHash();
