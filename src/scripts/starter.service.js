function local(el) {
  console.log(el);

}



export function onClick(event) {
  local(this);
  console.log(event);
  return false;
}

