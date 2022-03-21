function local(el) {
  console.log('local fn', el);

}



export function onClick(event) {
  local(this);
  console.log('click', event);
  return false;
}

