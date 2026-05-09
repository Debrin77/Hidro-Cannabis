// Navigation

function nav(el, view){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('view-'+view).classList.add('active');
  if(view==='inicio') renderInicio();
  if(view==='cultivo') renderCultivo();
  if(view==='monitor') renderMonitor();
  if(view==='semanas') renderSemanas();
  if(view==='nutrientes') renderNutrientes();
}
