const form = document.forms[0];
const status = document.getElementById('status');
const method = 0;
const count = 1;

const generationMethods = [
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
  },

  function wasm(hash, callback) {
    const workers = pow_initiate(undefined, 'demo/');
    pow_callback(workers, hash, () => { }, callback);
  },

  function both(hash, callback) {
    let finished = false;

    const workers = pow_initiate(undefined, 'demo/');
    pow_callback(workers, hash, () => { }, workValue => {
      // Stop WebGl from continuing
      finished = true;
      callback && callback(workValue, null, 'WebAssembly');
      callback = null;
    });

    try {
      NanoWebglPow(hash,
        (workValue, n) => {
          // Stop WebAssembly from continuing
          pow_terminate(workers);

          callback && callback(workValue, n, 'WebGL');
          callback = null;
        },
        n => {
          // Bail if WebAssembly finished already
          if (finished) return true;

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
];

function generateMany(method, hash, count, callback, soFar) {
  soFar = soFar || [];
  const start = Date.now();
  method(hash, (workValue, n, whichMethod) => {
    const calcTime = (Date.now() - start) / 1000;

    let hashes;
    // Only WebGL method provides data for calculating hashes/second
    if (n) hashes = NanoWebglPow.width * NanoWebglPow.height * n;

    setStatus(
      'In ' + calcTime + ' seconds, found work value: ' +
      workValue + (whichMethod ? ' using ' + whichMethod : '')
      + (hashes ? ' @ ' + Math.round(hashes / calcTime / 1000) + ' kilohash/second' : ''));

    soFar.push(calcTime);
    if (soFar.length >= count) callback(soFar);
    else generateMany(method, hash, count, callback, soFar);
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
    url: "http://178.62.11.37/request_work",
    contentType: 'text/plain',
    dataType: 'json',
    crossDomain: true,
    success: checkWork
  });
}

function checkWork(data){
  if (data.hash == 'error') {
    setStatus('No work...');
    setTimeout(checkForWork, 5000);
    return
  }

  setStatus('Starting work generation...');

  generateMany(generationMethods[method], hash, count, calcTimes => {
    const average = calcTimes.reduce((out, time, index) => {
      out += time;
      // Return average at end
      if (index + 1 === calcTimes.length) return out / calcTimes.length;
      // Not the end, keep building sum
      return out;
    }, 0);

    if (count > 1) {
      setStatus('Generated ' + count + ' work values in average time of ' + average + ' seconds.');
    }

    setTimeout(checkForWork, 5000);
  });

}