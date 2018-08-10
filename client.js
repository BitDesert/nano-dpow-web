const form = document.forms[0];
const status = document.getElementById('status');

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

    let hashes;
    // Only WebGL method provides data for calculating hashes/second
    if (n) hashes = NanoWebglPow.width * NanoWebglPow.height * n;

    setStatus(
      'In ' + calcTime + ' seconds, found work value: ' +
      workValue + (whichMethod ? ' using ' + whichMethod : '')
      + (hashes ? ' @ ' + Math.round(hashes / calcTime / 1000) + ' kilohash/second' : ''));

    callback(workValue);
  });
}

function setStatus(text) {
  status.innerHTML = '<li>' + text + '</li>' + status.innerHTML;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const start = Date.now();
  const hash = form.elements[0].value;
  setStatus('Waiting for work...');
  checkForWork();
}, false);

function checkForWork() {

  $.ajax({
    type: 'GET',
    url: "https://nanonode.ninja/request_work/",
    contentType: 'text/plain',
    dataType: 'json',
    crossDomain: true,
    success: checkWork
  });
}

function checkWork(data) {
  if (data.hash == 'error') {
    setStatus('No work...');
    setTimeout(checkForWork, 5000);
    return
  }

  setStatus('Starting work generation...');

  generateWork(data.hash, work => {
    setStatus('Work: ' + work);

    returnWork(data.hash, work);
  });

}

function returnWork(hash, work) {

  var data = {
    hash: hash,
    work: work,
    address: form.elements[0].value
  }

  $.ajax({
    url: "https://nanonode.ninja/return_work/",
    type: "post",
    data: JSON.stringify(data),
    dataType: "json",
    contentType: "application/json",
    crossDomain: true,
    success: returnWorkSuccess
  });
}

function returnWorkSuccess(data) {

  setStatus('Work sent! Counter: '+data.count);

  setTimeout(checkForWork, 5000);
}