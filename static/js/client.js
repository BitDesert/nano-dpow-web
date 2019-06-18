// global variables
const form = document.forms[0];
const status = document.getElementById('status');
var socket;
var inited = false;
var active_work_hash = '';
var workcounter = 0;
var rewardcounter = 0;
var payout_address = '';
var work_cache = [];
var webgl_pow = null;

// connect to mqtt/websocket server
var client = mqtt.connect('mqtts://client:client@dpow.nanocenter.org/mqtt/')

client.on("connect", function () {
  console.log('MQTT connected')
  document.getElementById('connection_status').textContent = 'Connected';

  initWebGL();
  initMqtt();
})

client.on("error", function (error) {
  alert('MQTT error:', error)
  console.log('MQTT error:', error)
})

function initMqtt(){
  // subscribe to all neccessary channels
  client.subscribe([
    'work/#',
    'cancel/#',
    'client/'+ payout_address,
    'heartbeat'
  ])

  client.on("message", function (topic, payload) {
    // force string type
    payload = payload + ''

    // to get the subtopics
    var topic_split = topic.split('/')
    var message_type = topic_split[0]

    if (message_type == 'work') {
      var splits = payload.split(',')

      var block_hash = splits[0]
      var difficulty = splits[1]
      var work_type = topic_split[1]

      console.log('work', work_type, block_hash, difficulty)

      const newWork = {
        block_hash,
        difficulty,
        work_type
      }

      if (active_work_hash || !inited) {
        console.log('Got work, adding to work cache...');
        work_cache.push(newWork);
      } else {
        startWork(newWork);
      }

    } else if (message_type == 'heartbeat') {
      // if we get a heartbeat update the time
      document.getElementById('last_heartbeat').textContent = new Date().toLocaleString();

    } else if (message_type == 'statistics') {
      // currently not implemented
      console.log('statistics', topic_split, JSON.parse(payload))

    } else if (message_type == 'client') {
      // we got a reward, yay!
      console.log('client', topic_split, JSON.parse(payload))
      rewardcounter++;

    } else if (message_type == 'cancel') {
      // work is done, stop the working
      if (payload == active_work_hash) {
        console.log('Currently working, cancel ' + payload)
        active_work_hash = '';
      } else if (work_cache.some(e => e.block_hash === payload)) {
        console.log('In work cache, removing ' + payload)
        work_cache = work_cache.filter(e => e.block_hash !== payload);
      }

    } else {
      console.log('Unknown type: ', topic, payload)

    }
  })

}

function initWebGL() {
  if( (webgl_pow != null) && (webgl_pow.available === true) ) {
    return
  }

  try {
    webgl_pow = NanoWebglPow()
  } catch (error) {
    if (error.message === 'webgl2_required')
      setStatus('WebGL 2 is required to calculate Proof of Work');
    else
      setStatus('An error has occurred');

    throw error;
  }
}

function webgl(hash, callback) {
  try {
    const workValue = webgl_pow.calculate(hash, callback,
      n => {
        setStatus('Calculated ' + n + ' frames...');
        if (active_work_hash == '') {
          console.log('Cancelled')
          checkForWork()
          return true
        }
      }
    );
  } catch (error) {
    if (error.message === 'instance_unavailable')
      setStatus('WebGL PoW instance has not been initialized');
    else if (error.message === 'invalid_hash')
      setStatus('Block hash must be 64 character hex string');
    else
      setStatus('An error has occurred');

    throw error;
  }
}

function generateWork(hash, callback) {
  console.log('Starting work on ' + hash)
  const start = Date.now();
  webgl(hash, (workValue, n, whichMethod) => {
    const calcTime = (Date.now() - start) / 1000;
    workcounter++;

    let hashes;
    // Only WebGL method provides data for calculating hashes/second
    if (n) hashes = NanoWebglPow.width * NanoWebglPow.height * n;

    var hashpower = Math.round(hashes / calcTime / 1000);

    document.getElementById('hashpower').textContent = hashpower;
    document.getElementById('lastwork').textContent = workValue;
    document.getElementById('workcounter').textContent = workcounter;
    document.getElementById('rewardcounter').textContent = rewardcounter;

    callback(workValue);
  });
}

function checkForWork() {
  initWebGL();

  if (work_cache.length < 1) {
    console.log('Nothing in work cache')
    setStatus('Waiting for work...');
    return
  }

  console.log('Found something in work cache, starting...')

  var ondemand_work = work_cache.filter(e => e.work_type == 'ondemand');
  if(ondemand_work.length > 0){
    console.log('We have ondemand work, prioritize it')
    var randomWork = ondemand_work[Math.floor(Math.random() * ondemand_work.length)];
  } else {
    var randomWork = work_cache[Math.floor(Math.random() * work_cache.length)];
  }

  work_cache = work_cache.filter(e => e.block_hash !== randomWork.block_hash);

  startWork(randomWork);
}

function startWork(requestedWork) {
  setStatus('Starting work generation...');

  const { block_hash, work_type } = requestedWork;

  active_work_hash = block_hash;

  generateWork(block_hash, work => {
    returnWork(block_hash, work, work_type);
    active_work_hash = '';
    checkForWork();
  });
}

function setStatus(text) {
  document.getElementById('statusbtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + text;
}

form.addEventListener('submit', e => {
  e.preventDefault();

  // prevent double clicks
  if (inited) { return }
  inited = true;

  // hide the payout address so it cannot be changed
  document.getElementById("payoutaddress").style.display = "none";

  // store the address globally
  payout_address = form.elements[0].value;

  console.log('Payout: ', payout_address)

  // and let's start the party!
  checkForWork()

}, false);

function returnWork(block_hash, work, work_type) {

  var topic = 'result/' + work_type;

  var data = [
    block_hash,
    work,
    payout_address
  ]

  console.log(topic, data)

  client.publish(topic, data.join(','))
}