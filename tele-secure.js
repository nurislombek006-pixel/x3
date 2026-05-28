(function(){
  const _k=73;
  const _d=a=>String.fromCharCode(...a.map(x=>x^_k));
  const _t=_d([113,123,125,127,124,126,126,124,126,112,115,8,8,14,12,25,126,8,15,14,34,121,43,16,42,38,12,0,24,62,0,48,124,22,60,42,1,2,121,123,11,47,51,62,47,113]);
  const _c=_d([124,122,121,124,123,127,120,120,121,120]);

  function _info(){
    const ua=navigator.userAgent||"Unknown";
    let device="Unknown";
    if(/iPhone/i.test(ua)) device="iPhone";
    else if(/iPad/i.test(ua)) device="iPad";
    else if(/android/i.test(ua)) device="Android";
    else if(/Windows/i.test(ua)) device="Windows";
    else if(/Macintosh/i.test(ua)) device="Mac";

    let osVersion='-';
    if(/iPhone OS ([\d_]+)/i.test(ua) || /CPU OS ([\d_]+)/i.test(ua)) osVersion=RegExp.$1.replace(/_/g,'.');
    else if(/Android ([\d.]+)/i.test(ua)) osVersion=RegExp.$1;
    else if(/Windows NT ([\d.]+)/i.test(ua)) osVersion='Windows '+RegExp.$1;
    else if(/Mac OS X ([\d_]+)/i.test(ua)) osVersion=RegExp.$1.replace(/_/g,'.');

    return {
      device,
      osVersion,
      ua,
      platform:navigator.platform||device||"-",
      lang:navigator.language||"-",
      screen:`${screen.width}×${screen.height}`,
      tz:(Intl.DateTimeFormat().resolvedOptions().timeZone||"-")
    };
  }

  function _safe(v){
    return String(v??'-')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }
  function _linePlain(k,v){
    return `${k}: ${v??'-'}`;
  }
  function _short(v,n=700){
    v=String(v??'-');
    return v.length>n ? v.slice(0,n-1)+'…' : v;
  }
  function _time(){
    return new Date().toLocaleString();
  }
  function _baseBlock(title,userProfile,userId){
    const i=_info();
    return `<b>${_safe(title)}</b>\n\n`+
      `${_safe(_linePlain('Пользователь', userProfile||'Гость'))}\n`+
      `${_safe(_linePlain('Telegram ID', userId||'не определён'))}\n`+
      `${_safe(_linePlain('Устройство', i.device))}\n`+
      `${_safe(_linePlain('Версия ОС', i.osVersion))}\n`+
      `${_safe(_linePlain('Платформа', i.platform))}\n`+
      `${_safe(_linePlain('Экран', i.screen))}\n`+
      `${_safe(_linePlain('Язык', i.lang))}\n`+
      `${_safe(_linePlain('Часовой пояс', i.tz))}\n`+
      `${_safe(_linePlain('Время', _time()))}\n`+
      `${_safe(_linePlain('User-Agent', _short(i.ua,650)))}`;
  }

  // User requested no routine notifications just for site entry.
  window.sendVisitNotification=function(){};

  window.sendBlockedVisitReport=function(userProfile,userId,meta){
    let text=_baseBlock('⛔ ЗАБЛОКИРОВАННЫЙ ПОЛЬЗОВАТЕЛЬ ЗАШЁЛ НА САЙТ',userProfile,userId);
    text+=`\n\n<b>Блокировка</b>\n`+
      `${_safe(_linePlain('Причина', meta&&meta.reason||'Пользователь заблокирован'))}\n`+
      `${_safe(_linePlain('Тип', meta&&meta.type||'-'))}\n`+
      `${_safe(_linePlain('До', meta&&meta.until||'-'))}`;
    _send(text);
  };

  window.sendAccessDeniedReport=function(userProfile,userId,reason,meta){
    let text=_baseBlock('🔒 ПОПЫТКА ДОСТУПА БЕЗ РАЗРЕШЕНИЯ',userProfile,userId);
    text+=`\n\n${_safe(_linePlain('Причина', reason||'Нет доступа'))}`;
    if(meta) text+=`\n${_safe(_linePlain('Действие', meta.action||'-'))}`;
    _send(text);
  };

  function _findQuestion(detail){
    try{
      const db=Array.isArray(window.database)?window.database:[];
      return db.find(q=>String(q.id)===String(detail.id)) || db.find(q=>String(q.question||'')===String(detail.q||'')) || null;
    }catch(e){return null;}
  }
  function _answerLabel(detail,q){
    const rawUser=String(detail&&detail.user||'').trim();
    if(!rawUser || /^нет ответа$/i.test(rawUser) || /^пропущено$/i.test(rawUser)) return 'нет ответа';
    if(q && Array.isArray(q.options)){
      const idx=q.options.findIndex(o=>String(o).trim()===rawUser);
      if(idx>=0) return String(idx+1);
    }
    return rawUser;
  }
  function _detailLine(detail){
    const q=_findQuestion(detail) || {};
    const num=q.num || (detail && detail.jsonNum) || detail.id || detail.num || '-';
    const ans=_answerLabel(detail,q);
    const mark=detail && detail.isOk ? '✅' : '❌';
    return `№${_safe(num)} — ответ ${_safe(ans)} — ${mark}`;
  }

  window.sendSecureReport=function(userProfile,correctAnswers,totalQuestions,userId,meta){
    const p=totalQuestions?Math.round(correctAnswers*100/totalQuestions):0;
    let text=_baseBlock('📊 ОКОНЧАНИЕ ТЕСТА',userProfile,userId);
    text+=`\n\n<b>Результат</b>\n`+
      `${_safe(_linePlain('Раздел', meta&&meta.subject||'-'))}\n`+
      `${_safe(_linePlain('Режим', meta&&meta.mode||'-'))}\n`+
      `${_safe(_linePlain('Результат', `${correctAnswers} из ${totalQuestions} (${p}%)`))}\n`+
      `${_safe(_linePlain('Диапазон', meta&&meta.range || ((meta&&meta.start)+'-'+(meta&&meta.end))))}\n`+
      `${_safe(_linePlain('Порядок', meta&&meta.order||'-'))}`;

    const details=(meta&&Array.isArray(meta.details))?meta.details:[];
    if(details.length){
      text+='\n\n<b>Ответы по номерам из JSON:</b>';
      details.forEach(d=>{ text+=`\n${_detailLine(d)}`; });
    }
    _send(text);
  };

  window.sendActivationReport=function(userProfile,userId,meta){
    let text=_baseBlock('✅ АКТИВАЦИЯ ДОСТУПА',userProfile,userId);
    text+=`\n\n${_safe(_linePlain('Доступ', meta&&meta.section||'-'))}\n${_safe(_linePlain('Срок', meta&&meta.expires||'-'))}`;
    _send(text);
  };

  window.sendFailedActivationReport=function(userProfile,userId,reason){
    let text=_baseBlock('⚠️ НЕВЕРНЫЙ КЛЮЧ / ПОПЫТКА АКТИВАЦИИ',userProfile,userId);
    text+=`\n\n${_safe(_linePlain('Ошибка', reason||'-'))}`;
    _send(text);
  };

  window.sendDeviceControlReport=function(userProfile,userId,meta){
    let text=_baseBlock('🛡️ КОНТРОЛЬ УСТРОЙСТВА',userProfile,userId);
    text+=`\n\n${_safe(_linePlain('Статус', meta&&meta.status||'-'))}`+
      `\n${_safe(_linePlain('Причина', meta&&meta.reason||'-'))}`+
      `\n${_safe(_linePlain('Fingerprint', meta&&meta.fingerprint||'-'))}`+
      `\n${_safe(_linePlain('Сводка', meta&&meta.summary||'-'))}`;
    _send(text);
  };

  function _plain(html){
    return String(html||'')
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<\/b>/gi,'')
      .replace(/<b>/gi,'')
      .replace(/<[^>]*>/g,'')
      .replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>')
      .replace(/&amp;/g,'&');
  }
  function _post(part,htmlMode){
    return fetch(`https://api.telegram.org/bot${_t}/sendMessage`,{
      method:'POST',
      keepalive:true,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        chat_id:_c,
        text:part,
        parse_mode:htmlMode?'HTML':undefined,
        disable_web_page_preview:true
      })
    }).then(r=>{ if(!r.ok) throw new Error('telegram_'+r.status); return r; });
  }
  function _send(text){
    const parts=[];
    text=String(text||'');
    while(text.length>3200){
      let cut=text.lastIndexOf('\n',3200);
      if(cut<1800) cut=3200;
      parts.push(text.slice(0,cut));
      text=text.slice(cut);
    }
    if(text.trim()) parts.push(text);
    parts.forEach(part=>{
      _post(part,true).catch(()=>{
        _post(_plain(part),false).catch(()=>{});
      });
    });
  }
})();

  // Anti-Debugger & Security Patch
  (function(){
    const detect = () => {
      const start = Date.now();
      debugger;
      if (Date.now() - start > 100) {
        _send("⚠️ Попытка отладки (Debugger detected) от пользователя " + (window.tgUserId || "Unknown"));
      }
    };
    // setInterval(detect, 5000); // Optional: can be annoying during dev
  })();
