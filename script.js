/* =========================================================
   ÉTAT GLOBAL DE NAVIGATION
   nav.view   : 'home' | 'module'
   nav.moduleIndex : index dans MODULES
   nav.type   : 'qcm' | 'qcr' | 'trou' | 'schema'
   nav.seriesIndex : index de la série choisie dans ce type
   ========================================================= */
let nav = { view: 'home', moduleIndex: 0, type: 'qcm', seriesIndex: 0, theme: 'all' };

const TYPE_LABELS = { qcm: 'QCM', qcr: 'QCR', trou: 'Texte à trou', schema: 'Schéma à compléter' };
const TYPE_ORDER = ['qcm', 'qcr', 'trou', 'schema'];

function normalize(s){
  return (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Parties sélectionnables d'un module (ex: "Armement", "Topographie"). Définies explicitement
   dans mod.parts — si ce tableau est vide, le module n'a pas d'étape de choix de partie
   (comportement classique : tout s'affiche, comme le Module 1). */
function getParts(mod){
  return mod.parts || [];
}

function themeMatch(itemModule){
  return nav.theme === 'all' || itemModule === nav.theme;
}

function firstAvailableType(mod){
  return TYPE_ORDER.find(t => mod[t].length > 0) || 'qcm';
}

/* État des réponses de l'utilisateur, par module / par type / par série */
const state = MODULES.map(mod => ({
  qcm: mod.qcm.map(s => ({ answers: new Array(s.questions.length).fill(null), corrected: false })),
  trou: mod.trou.map(s => ({
    answers: s.items.map(it => new Array(it.blanks.length).fill('')),
    corrected: false
  })),
  schema: mod.schema.map(s => ({
    answers: s.items.map(it => new Array(it.legend.length).fill('')),
    nameAnswers: new Array(s.items.length).fill(''),
    corrected: false
  }))
}));

function currentModule(){ return MODULES[nav.moduleIndex]; }
function currentModState(){ return state[nav.moduleIndex]; }

/* ---------------- TOP TAB BAR (type d'exercice) ---------------- */
function renderTabbar(){
  const tabbar = document.getElementById('tabbar');
  tabbar.innerHTML = '';
  if(nav.view !== 'module'){ return; }
  const mod = currentModule();
  if(getParts(mod).length > 0 && nav.theme === null){ return; } // encore sur l'écran de choix de partie
  TYPE_ORDER.forEach(type => {
    const list = mod[type];
    const btn = document.createElement('button');
    btn.className = 'tab' + (nav.type === type ? ' active' : '');
    btn.innerHTML = `<span>${TYPE_LABELS[type]}</span><span class="tab-score">${list.length}</span>`;
    btn.onclick = () => {
      nav.type = type;
      nav.seriesIndex = 0;
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    tabbar.appendChild(btn);
  });
}

/* ---------------- VUE ACCUEIL : liste des modules ---------------- */
function renderHome(){
  const content = document.getElementById('content');
  content.innerHTML = '';

  const intro = document.createElement('div');
  intro.className = 'home-intro';
  intro.innerHTML = `<h2>Modules de révision</h2><p>Sélectionne un module pour accéder à ses QCM, QCR, textes à trou et schémas à compléter.</p>`;
  content.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'home-grid';

  MODULES.forEach((mod, i) => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
      <h3>${mod.title}</h3>
      <p>${mod.subtitle || ''}</p>
      <div class="module-stats">
        <span class="stat">${mod.qcm.length} série(s) QCM</span>
        <span class="stat">${mod.qcr.length} série(s) QCR</span>
        <span class="stat">${mod.trou.length} texte(s) à trou</span>
        <span class="stat">${mod.schema.length} schéma(s)</span>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = 'Réviser ce module →';
    btn.onclick = () => {
      nav = { view: 'module', moduleIndex: i, type: 'qcm', seriesIndex: 0, theme: null };
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    card.appendChild(btn);
    grid.appendChild(card);
  });

  content.appendChild(grid);
}

/* ---------------- VUE MODULE ---------------- */
function renderSeriesPills(list, activeIndex, scoreLabelFn, onSelect){
  const wrap = document.createElement('div');
  wrap.className = 'series-tabbar';
  list.forEach((s, i) => {
    const pill = document.createElement('button');
    pill.className = 'series-pill' + (i === activeIndex ? ' active' : '');
    const scoreLabel = scoreLabelFn(i);
    pill.innerHTML = `<span>${s.title}</span>${scoreLabel ? `<span class="pill-score">${scoreLabel}</span>` : ''}`;
    pill.onclick = () => { onSelect(i); };
    wrap.appendChild(pill);
  });
  return wrap;
}

/* Écran affiché quand on entre dans un module qui a des parties (mod.parts non vide)
   et qu'aucune partie n'a encore été choisie : un menu pour choisir "Armement",
   "Topographie", etc. avant de voir le moindre exercice. */
function renderPartChooser(mod, parts){
  const content = document.getElementById('content');
  content.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = '← Retour aux modules';
  back.onclick = () => { nav.view = 'home'; renderAll(); window.scrollTo({top:0, behavior:'smooth'}); };
  content.appendChild(back);

  const title = document.createElement('h2');
  title.className = 'quiz-title';
  title.textContent = mod.title;
  content.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'quiz-sub';
  sub.textContent = 'Choisis la partie que tu veux réviser.';
  content.appendChild(sub);

  const grid = document.createElement('div');
  grid.className = 'home-grid';
  parts.forEach(part => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `<h3>${part}</h3>`;
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = 'Réviser cette partie →';
    btn.onclick = () => {
      nav.theme = part;
      nav.type = firstAvailableType(mod);
      nav.seriesIndex = 0;
      renderAll();
      window.scrollTo({top:0, behavior:'smooth'});
    };
    card.appendChild(btn);
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

/* Sélecteur compact affiché en haut d'un module à parties, une fois une partie choisie,
   pour permettre d'en changer sans repasser par l'accueil. */
function renderPartSwitcher(mod, parts){
  const wrap = document.createElement('div');
  wrap.className = 'series-tabbar theme-tabbar';

  const label = document.createElement('span');
  label.className = 'theme-filter-label';
  label.textContent = 'Partie : ';
  wrap.appendChild(label);

  parts.forEach(part => {
    const pill = document.createElement('button');
    pill.className = 'series-pill' + (nav.theme === part ? ' active' : '');
    pill.textContent = part;
    pill.onclick = () => {
      nav.theme = part;
      nav.type = firstAvailableType(mod);
      nav.seriesIndex = 0;
      renderAll();
    };
    wrap.appendChild(pill);
  });

  return wrap;
}

function renderModule(){
  const mod = currentModule();
  const parts = getParts(mod);

  if(parts.length === 0){
    nav.theme = 'all'; // module sans sous-parties : comportement classique, rien à filtrer
  } else if(nav.theme === null){
    renderPartChooser(mod, parts);
    return;
  }

  const content = document.getElementById('content');
  content.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'back-btn';
  back.textContent = parts.length > 0 ? '← Changer de partie' : '← Retour aux modules';
  back.onclick = () => {
    if(parts.length > 0){ nav.theme = null; }
    else { nav.view = 'home'; }
    renderAll();
    window.scrollTo({top:0, behavior:'smooth'});
  };
  content.appendChild(back);

  const title = document.createElement('h2');
  title.className = 'quiz-title';
  title.textContent = mod.title + (parts.length > 0 ? ' — ' + nav.theme : '');
  content.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'quiz-sub';
  sub.textContent = TYPE_LABELS[nav.type] + (mod[nav.type].length ? ' — choisis une série ci-dessous.' : '');
  content.appendChild(sub);

  if(parts.length > 1){
    content.appendChild(renderPartSwitcher(mod, parts));
  }

  const list = mod[nav.type];

  if(list.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = `Aucun contenu "${TYPE_LABELS[nav.type]}" pour ce module pour l'instant. Il sera ajouté ici.`;
    content.appendChild(empty);
    return;
  }

  if(nav.seriesIndex >= list.length) nav.seriesIndex = 0;

  let scoreLabelFn;
  if(nav.type === 'qcm'){
    scoreLabelFn = (i) => {
      const st = currentModState().qcm[i];
      if(!st.corrected) return null;
      const q = mod.qcm[i];
      const idxs = q.questions.map((qq,qi)=>qi).filter(qi => themeMatch(q.questions[qi].module));
      const score = idxs.reduce((acc,qi)=> acc + (st.answers[qi]===q.questions[qi].correct?1:0), 0);
      return `${score}/${idxs.length}`;
    };
  } else if(nav.type === 'trou'){
    scoreLabelFn = (i) => {
      const st = currentModState().trou[i];
      if(!st.corrected) return null;
      const s = mod.trou[i];
      let total=0, ok=0;
      s.items.forEach((it, ii) => { if(!themeMatch(it.module)) return; it.blanks.forEach((b, bi) => { total++; if(normalize(st.answers[ii][bi])===normalize(b)) ok++; }); });
      return `${ok}/${total}`;
    };
  } else if(nav.type === 'schema'){
    scoreLabelFn = (i) => {
      const st = currentModState().schema[i];
      if(!st.corrected) return null;
      const s = mod.schema[i];
      let total=0, ok=0;
      s.items.forEach((it, ii) => {
        if(!themeMatch(it.module)) return;
        if(it.name){ total++; if(normalize(st.nameAnswers[ii]) === normalize(it.name)) ok++; }
        it.legend.forEach((l, li) => { total++; if(normalize(st.answers[ii][li])===normalize(l.answer)) ok++; });
      });
      return `${ok}/${total}`;
    };
  } else {
    scoreLabelFn = () => null;
  }

  content.appendChild(renderSeriesPills(list, nav.seriesIndex, scoreLabelFn, (i) => {
    nav.seriesIndex = i;
    renderAll();
  }));

  if(nav.type === 'qcm') renderQcmSeries(content, mod, nav.seriesIndex);
  else if(nav.type === 'qcr') renderQcrSeries(content, mod, nav.seriesIndex);
  else if(nav.type === 'trou') renderTrouSeries(content, mod, nav.seriesIndex);
  else if(nav.type === 'schema') renderSchemaSeries(content, mod, nav.seriesIndex);
}

/* ---------------- QCM ---------------- */
const LETTERS = ['A','B','C','D'];

function renderQcmSeries(content, mod, seriesIndex){
  const series = mod.qcm[seriesIndex];
  const st = currentModState().qcm[seriesIndex];
  const visible = series.questions.map((q, qi) => qi).filter(qi => themeMatch(series.questions[qi].module));

  if(visible.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = `Aucune question "${nav.theme}" dans cette série.`;
    content.appendChild(empty);
    return;
  }

  visible.forEach(qi => {
    const q = series.questions[qi];
    const card = document.createElement('div');
    card.className = 'qcard';

    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.innerHTML = `<span class="qnum">Question ${qi+1}</span>
      <span class="tag-group">
        <span class="tag module">${q.module}</span>
        <span class="tag ${q.type}">${q.type==='false' ? 'Trouve la fausse' : 'Trouve la bonne'}</span>
      </span>`;
    card.appendChild(meta);

    if(q.stem){
      const stem = document.createElement('p');
      stem.className = 'stem';
      stem.textContent = q.stem;
      card.appendChild(stem);
    }

    q.options.forEach((opt, oi) => {
      const label = document.createElement('label');
      label.className = 'option';
      if(st.corrected) label.classList.add('locked');

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `qcm_${nav.moduleIndex}_${seriesIndex}_${qi}`;
      input.checked = st.answers[qi] === oi;
      input.disabled = st.corrected;
      input.onchange = () => { st.answers[qi] = oi; };

      const letterSpan = document.createElement('span');
      letterSpan.className = 'letter';
      letterSpan.textContent = LETTERS[oi];

      const textSpan = document.createElement('span');
      textSpan.textContent = opt;

      label.appendChild(input);
      label.appendChild(letterSpan);
      label.appendChild(textSpan);

      if(st.corrected){
        if(oi === q.correct) label.classList.add('correct');
        else if(st.answers[qi] === oi) label.classList.add('incorrect');
      }

      card.appendChild(label);
    });

    content.appendChild(card);
  });

  const actionBar = document.createElement('div');
  actionBar.className = 'action-bar';

  const correctBtn = document.createElement('button');
  correctBtn.className = 'primary';
  correctBtn.textContent = 'Corriger le QCM';
  correctBtn.onclick = () => { st.corrected = true; renderAll(); };
  actionBar.appendChild(correctBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'ghost';
  resetBtn.textContent = 'Réinitialiser';
  resetBtn.onclick = () => {
    st.answers = new Array(series.questions.length).fill(null);
    st.corrected = false;
    renderAll();
  };
  actionBar.appendChild(resetBtn);

  const scorePill = document.createElement('span');
  scorePill.className = 'score-pill' + (st.corrected ? ' show' : '');
  if(st.corrected){
    const score = visible.reduce((acc,qi)=> acc + (st.answers[qi]===series.questions[qi].correct?1:0), 0);
    scorePill.textContent = `Score : ${score} / ${visible.length}`;
  }
  actionBar.appendChild(scorePill);

  content.appendChild(actionBar);
}

/* ---------------- QCR ---------------- */
function renderQcrSeries(content, mod, seriesIndex){
  const series = mod.qcr[seriesIndex];
  const visible = series.items.map((it, qi) => qi).filter(qi => themeMatch(series.items[qi].module));

  if(visible.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = `Aucune question "${nav.theme}" dans cette série.`;
    content.appendChild(empty);
    return;
  }

  visible.forEach(qi => {
    const item = series.items[qi];
    const card = document.createElement('div');
    card.className = 'qcr-card';

    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.innerHTML = `<span class="tag-group"><span class="tag module">${item.module}</span></span>`;
    card.appendChild(meta);

    const stem = document.createElement('p');
    stem.className = 'stem';
    stem.textContent = `${qi+1}. ${item.q}`;
    card.appendChild(stem);

    const ta = document.createElement('textarea');
    ta.placeholder = 'Écris ta réponse ici avant de vérifier...';
    card.appendChild(ta);

    const revealBtn = document.createElement('button');
    revealBtn.className = 'reveal-btn';
    revealBtn.textContent = 'Voir la réponse';
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer';
    answerDiv.textContent = item.a;
    revealBtn.onclick = () => {
      answerDiv.classList.toggle('show');
      revealBtn.textContent = answerDiv.classList.contains('show') ? 'Masquer la réponse' : 'Voir la réponse';
    };
    card.appendChild(revealBtn);
    card.appendChild(answerDiv);

    content.appendChild(card);
  });
}

/* ---------------- TEXTE À TROU ----------------
   Format attendu pour chaque item :
   {
     "module": "Nom du module",
     "text": "Le ___ est ... et le ___ aussi.",   // "___" marque chaque trou, dans l'ordre
     "blanks": ["réponse1", "réponse2"]           // une réponse par "___", dans l'ordre
   }
------------------------------------------------- */
function renderTrouSeries(content, mod, seriesIndex){
  const series = mod.trou[seriesIndex];
  const st = currentModState().trou[seriesIndex];
  const visible = series.items.map((it, ii) => ii).filter(ii => themeMatch(series.items[ii].module));

  if(visible.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = `Aucun texte "${nav.theme}" dans cette série.`;
    content.appendChild(empty);
    return;
  }

  visible.forEach(ii => {
    const item = series.items[ii];
    const card = document.createElement('div');
    card.className = 'trou-card';

    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.innerHTML = `<span class="qnum">Texte ${ii+1}</span><span class="tag-group"><span class="tag module">${item.module}</span></span>`;
    card.appendChild(meta);

    const textP = document.createElement('p');
    textP.className = 'trou-text';

    const parts = item.text.split('___');
    parts.forEach((part, pi) => {
      textP.appendChild(document.createTextNode(part));
      if(pi < parts.length - 1){
        const input = document.createElement('input');
        input.className = 'blank-input';
        input.type = 'text';
        input.value = st.answers[ii][pi] || '';
        input.disabled = st.corrected;
        input.oninput = () => { st.answers[ii][pi] = input.value; };
        if(st.corrected){
          const ok = normalize(input.value) === normalize(item.blanks[pi]);
          input.classList.add(ok ? 'correct' : 'incorrect');
        }
        textP.appendChild(input);
      }
    });
    card.appendChild(textP);

    if(st.corrected){
      const wrong = [];
      item.blanks.forEach((b, bi) => {
        if(normalize(st.answers[ii][bi]) !== normalize(b)) wrong.push(b);
      });
      if(wrong.length){
        const hint = document.createElement('span');
        hint.className = 'blank-hint';
        hint.textContent = 'Réponse(s) attendue(s) : ' + wrong.join(' · ');
        card.appendChild(hint);
      }
    }

    content.appendChild(card);
  });

  const actionBar = document.createElement('div');
  actionBar.className = 'action-bar';

  const correctBtn = document.createElement('button');
  correctBtn.className = 'primary';
  correctBtn.textContent = 'Corriger';
  correctBtn.onclick = () => { st.corrected = true; renderAll(); };
  actionBar.appendChild(correctBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'ghost';
  resetBtn.textContent = 'Réinitialiser';
  resetBtn.onclick = () => {
    st.answers = series.items.map(it => new Array(it.blanks.length).fill(''));
    st.corrected = false;
    renderAll();
  };
  actionBar.appendChild(resetBtn);

  const scorePill = document.createElement('span');
  scorePill.className = 'score-pill' + (st.corrected ? ' show' : '');
  if(st.corrected){
    let total=0, ok=0;
    visible.forEach(ii => { series.items[ii].blanks.forEach((b, bi) => { total++; if(normalize(st.answers[ii][bi])===normalize(b)) ok++; }); });
    scorePill.textContent = `Score : ${ok} / ${total}`;
  }
  actionBar.appendChild(scorePill);

  content.appendChild(actionBar);
}

/* ---------------- SCHÉMA À COMPLÉTER ----------------
   Format attendu pour chaque item :
   {
     "module": "Nom du module",
     "image": "URL de l'image (laisser vide si pas encore dispo)",
     "legend": [
       { "num": 1, "x": 20, "y": 30, "answer": "Nom de la pièce" },  // x/y en % de la position sur l'image
       ...
     ]
   }
-------------------------------------------------------- */
function renderSchemaSeries(content, mod, seriesIndex){
  const series = mod.schema[seriesIndex];
  const st = currentModState().schema[seriesIndex];
  const visible = series.items.map((it, ii) => ii).filter(ii => themeMatch(series.items[ii].module));

  if(visible.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = `Aucun schéma "${nav.theme}" dans cette série.`;
    content.appendChild(empty);
    return;
  }

  visible.forEach(ii => {
    const item = series.items[ii];
    const card = document.createElement('div');
    card.className = 'schema-card';

    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.innerHTML = `<span class="tag-group"><span class="tag module">${item.module}</span></span>`;
    card.appendChild(meta);

    if(item.name){
      const nameRow = document.createElement('div');
      nameRow.className = 'schema-name-row';
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Nom du schéma :';
      nameRow.appendChild(nameLabel);
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Écris le nom de ce schéma...';
      nameInput.value = st.nameAnswers[ii] || '';
      nameInput.disabled = st.corrected;
      nameInput.oninput = () => { st.nameAnswers[ii] = nameInput.value; };
      if(st.corrected){
        const ok = normalize(nameInput.value) === normalize(item.name);
        nameInput.classList.add(ok ? 'correct' : 'incorrect');
      }
      nameRow.appendChild(nameInput);
      if(st.corrected && normalize(nameInput.value) !== normalize(item.name)){
        const nameHint = document.createElement('span');
        nameHint.className = 'name-hint';
        nameHint.textContent = 'Nom attendu : ' + item.name;
        nameRow.appendChild(nameHint);
      }
      card.appendChild(nameRow);
    }

    const imgs = item.images || (item.image ? [item.image] : []);
    if(imgs.length){
      imgs.forEach(src => {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'schema-image-wrap';
        const img = document.createElement('img');
        img.src = src;
        img.title = 'Cliquer pour agrandir';
        img.onclick = () => { window.open(src, '_blank'); };
        imgWrap.appendChild(img);
        item.legend.forEach(l => {
          if(l.x == null || l.y == null) return; // pas de coordonnées : l'image porte déjà ses propres numéros
          const marker = document.createElement('div');
          marker.className = 'schema-marker';
          marker.style.left = l.x + '%';
          marker.style.top = l.y + '%';
          marker.textContent = l.num;
          imgWrap.appendChild(marker);
        });
        card.appendChild(imgWrap);
      });
    } else {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'schema-image-wrap';
      const ph = document.createElement('div');
      ph.className = 'schema-placeholder';
      ph.textContent = 'Image du schéma à venir — complète la légende ci-dessous.';
      imgWrap.appendChild(ph);
      card.appendChild(imgWrap);
    }

    const legend = document.createElement('div');
    legend.className = 'schema-legend';
    item.legend.forEach((l, li) => {
      const row = document.createElement('div');
      row.className = 'legend-row';

      const num = document.createElement('span');
      num.className = 'legend-num';
      num.textContent = l.num;
      row.appendChild(num);

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Nom de l\'élément ' + l.num;
      input.value = st.answers[ii][li] || '';
      input.disabled = st.corrected;
      input.oninput = () => { st.answers[ii][li] = input.value; };
      if(st.corrected){
        const ok = normalize(input.value) === normalize(l.answer);
        input.classList.add(ok ? 'correct' : 'incorrect');
      }
      row.appendChild(input);

      legend.appendChild(row);
    });
    card.appendChild(legend);

    if(st.corrected){
      const wrong = [];
      item.legend.forEach((l, li) => {
        if(normalize(st.answers[ii][li]) !== normalize(l.answer)) wrong.push(`${l.num}. ${l.answer}`);
      });
      if(wrong.length){
        const hint = document.createElement('span');
        hint.className = 'blank-hint';
        hint.textContent = 'Réponse(s) attendue(s) : ' + wrong.join(' · ');
        card.appendChild(hint);
      }
    }

    content.appendChild(card);
  });

  const actionBar = document.createElement('div');
  actionBar.className = 'action-bar';

  const correctBtn = document.createElement('button');
  correctBtn.className = 'primary';
  correctBtn.textContent = 'Corriger';
  correctBtn.onclick = () => { st.corrected = true; renderAll(); };
  actionBar.appendChild(correctBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'ghost';
  resetBtn.textContent = 'Réinitialiser';
  resetBtn.onclick = () => {
    st.answers = series.items.map(it => new Array(it.legend.length).fill(''));
    st.nameAnswers = new Array(series.items.length).fill('');
    st.corrected = false;
    renderAll();
  };
  actionBar.appendChild(resetBtn);

  const scorePill = document.createElement('span');
  scorePill.className = 'score-pill' + (st.corrected ? ' show' : '');
  if(st.corrected){
    let total=0, ok=0;
    visible.forEach(ii => {
      const it = series.items[ii];
      if(it.name){ total++; if(normalize(st.nameAnswers[ii]) === normalize(it.name)) ok++; }
      it.legend.forEach((l, li) => { total++; if(normalize(st.answers[ii][li])===normalize(l.answer)) ok++; });
    });
    scorePill.textContent = `Score : ${ok} / ${total}`;
  }
  actionBar.appendChild(scorePill);

  content.appendChild(actionBar);
}

function renderAll(){
  renderTabbar();
  if(nav.view === 'home') renderHome();
  else renderModule();
}

renderAll();
