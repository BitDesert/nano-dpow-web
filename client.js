const form = document.forms[0];
const status = document.getElementById('status');
var socket;
var inited = false;
var workcounter = 0;

function webgl(hash, callback) {
  try {
    const workValue = NanoWebglPow(hash, callback,
      n => {
        setStatus('Calculated ' + n + ' frames...');
      }
    );
  } catch (error) {
    if (error.message === 'webgl2_required')
      setStatus('WebGL 2 is required for this demo');
    else if (error.message === 'invalid_hash')
      setStatus('Block hash must be 64 character hex string');
    else
      setStatus('An error has occurred');

    throw error;
  }
}

function generateWork(hash, callback) {
  const start = Date.now();
  webgl(hash, (workValue, n, whichMethod) => {
    const calcTime = (Date.now() - start) / 1000;
    workcounter++;

    let hashes;
    // Only WebGL method provides data for calculating hashes/second
    if (n) hashes = NanoWebglPow.width * NanoWebglPow.height * n;

    var hashpower = Math.round(hashes / calcTime / 1000);

    $('#hashpower').text(hashpower);
    $('#lastwork').text(workValue);
    $('#workcounter').text(workcounter);

    setStatus('Waiting for work...');

    callback(workValue);
  });
}

function setStatus(text) {
  $('#statusbtn').html('<i class="fas fa-spinner fa-spin"></i> ' + text);
}

form.addEventListener('submit', e => {
  e.preventDefault();

  // prevent double clicks
  if (inited) { return }
  inited = true;

  const start = Date.now();

  setStatus('Registering at server...');

  socket = new WebSocket("wss://dpow.mynano.ninja/");

  socket.onopen = function (event) {
    var data = {
      work_type: 'any',
      address: form.elements[0].value
    }

    socket.send(JSON.stringify(data))
  };

  socket.onclose = function (e) {
    console.log('Disconnected!');
  };

  socket.onmessage = function (event) {
    var data = JSON.parse(event.data);

    if (data.status) {
      console.log('STATUS: ' + data.status);
      if (data.status == 'success') {
        setStatus('Waiting for work...');
      }

    } else if (data.hash) {
      console.log('HASH: ' + data.hash);

      setStatus('Starting work generation...');

      generateWork(data.hash, work => {
        returnWork(data.hash, work);
      });
    } else {
      console.log('UNKOWN: ' + data);
    }
  }

  setInterval(function () {
    socket.send('keepalive');
  }, 5000)
}, false);

function returnWork(hash, work) {

  var data = {
    hash: hash,
    work: work,
    address: form.elements[0].value
  }

  socket.send(JSON.stringify(data))
}