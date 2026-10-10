(function(){
 'use strict';let stream=null,timer=null;
 function stop(){clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;}
 function open(mode){
  const modal=document.createElement('dialog');modal.className='olen-lens-dialog';Object.assign(modal.style,{width:'min(520px,calc(100vw - 28px))',maxHeight:'85dvh',overflowY:'auto',scrollbarWidth:'none',background:'#062018',color:'#e8f7f0',border:'1px solid #4ef0ca66',borderRadius:'26px',padding:'22px'});
  const heading=document.createElement('h2');heading.textContent=mode==='nature'?'Nature Lens':mode==='product'?'Product Lens':'Ler QR / código';modal.appendChild(heading);
  const note=document.createElement('p');note.textContent=mode==='nature'?'Identificação tentativa de fauna e flora. A fotografia não confirma comestibilidade ou segurança.':mode==='product'?'Dados visíveis e informação pública. Catálogo e certificados do parceiro ainda não integrados.':'O conteúdo é apresentado antes de ser usado ou consultado.';modal.appendChild(note);
  const body=document.createElement('div');body.style.display='grid';body.style.gap='12px';modal.appendChild(body);
  const close=()=>{stop();modal.close();modal.remove();};modal.addEventListener('cancel',()=>{stop();modal.remove();});
  function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{borderRadius:'22px',border:'1px solid #4ef0ca66',padding:'12px',background:'#09271e',color:'#e8f7f0',fontSize:'15px'});b.onclick=fn;body.appendChild(b);return b;}
  function send(text,images,options){close();window.dispatchEvent(new CustomEvent('olen:lens:send',{detail:{text,images,...options}}));}
  function decoded(raw){stop();const d=window.OLENLensModel.decode(raw),p=document.createElement('p');p.style.whiteSpace='pre-wrap';p.textContent=d.value+'\n\n'+d.warning;body.appendChild(p);
   button('Usar na conversa',()=>send('Analisa o código lido.',[],{lensMode:mode==='product'&&d.kind==='product'?'product':'qr',decoded:raw}));
   if(d.kind==='url')button('Consultar recurso',()=>send('Consulta este recurso e relaciona-o com a experiência atual.',[],{lensMode:'qr',decoded:raw,consultResource:true}));
  }
  async function readQR(image){const canvas=document.createElement('canvas'),scale=Math.min(1,1400/Math.max(image.videoWidth||image.naturalWidth,image.videoHeight||image.naturalHeight));canvas.width=Math.round((image.videoWidth||image.naturalWidth)*scale);canvas.height=Math.round((image.videoHeight||image.naturalHeight)*scale);if(!canvas.width)return null;const c=canvas.getContext('2d');c.drawImage(image,0,0,canvas.width,canvas.height);const pixels=c.getImageData(0,0,canvas.width,canvas.height);return window.jsQR(pixels.data,canvas.width,canvas.height)?.data||null;}
  if(mode!=='nature')button('Ler com a câmara',async()=>{try{stop();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});const video=document.createElement('video');video.autoplay=true;video.playsInline=true;video.muted=true;video.srcObject=stream;video.style.width='100%';video.style.borderRadius='18px';body.appendChild(video);await video.play();
    const detector=window.BarcodeDetector?new BarcodeDetector({formats:['qr_code','ean_13','ean_8','upc_a','code_128']}):null;
    const scan=async()=>{if(!stream||!modal.isConnected)return;try{const found=detector?(await detector.detect(video))[0]?.rawValue:await readQR(video);if(found){video.remove();decoded(found);return;}}catch{}timer=setTimeout(scan,350);};void scan();
   }catch{stop();note.textContent='Não foi possível abrir a câmara. Autoriza o acesso ou escolhe uma fotografia.';}});
  const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;body.appendChild(input);
  button('Escolher fotografia',()=>{input.removeAttribute('capture');input.click();});if(mode!=='qr')button('Fotografar',()=>{input.setAttribute('capture','environment');input.click();});
  input.onchange=async()=>{const f=input.files?.[0];if(!f)return;if(!/^image\//.test(f.type)||f.size>3000000){note.textContent='Escolhe uma fotografia até 3 MB.';return;}const reader=new FileReader();reader.onload=()=>{const data=String(reader.result),img=new Image();img.onload=async()=>{if(mode==='qr'){const code=await readQR(img);if(code)decoded(code);else note.textContent='Não foi detetado um QR. Escolhe uma fotografia mais próxima e nítida.';return;}img.style.width='100%';img.style.borderRadius='18px';body.appendChild(img);button(mode==='nature'?'Identificar na Nature Lens':'Analisar na Product Lens',()=>send(mode==='nature'?'Identifica esta fauna ou flora e explica a incerteza.':'Analisa este produto e separa alegações dos dados confirmados.',[{name:f.name,type:f.type,data}],{lensMode:mode}));};img.src=data;};reader.readAsDataURL(f);};
  button('Fechar',close);document.body.appendChild(modal);modal.showModal();
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-olen-lens]');if(!b)return;const menu=document.getElementById('olenCbxAttachMenu');if(menu)menu.hidden=true;open(b.dataset.olenLens);});
 window.addEventListener('pagehide',stop);
})();
