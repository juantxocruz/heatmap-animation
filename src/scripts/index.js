import '../styles/index.scss';

import {
  onClick
} from './starter.service';

if (process.env.NODE_ENV === 'development') {
  require('../index.html');
}

console.log('webpack starterkit');

// https://observablehq.com/@lacroute/d3-parliament-export
// globals


// window
let doc = window.document;
// When the user clicks anywhere outside of the modal, close it
doc.addEventListener("click", onClick, false);

