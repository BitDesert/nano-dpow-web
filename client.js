var client = mqtt.connect('mqtts://client:client@dpow.nanocenter.org/mqtt/')

client.on("connect", function () {
  console.log('MQTT connected')
  $('#connection_status').text('Connected');
  client.subscribe('heartbeat')
})

client.on("error", function (error) {
  alert('MQTT error:', error)
  console.log('MQTT error:', error)
})

const form = document.forms[0];
const status = document.getElementById('status');
var socket;
var inited = false;
var is_working = '';
var workcounter = 0;
var payout_address = '';
var work_cache = [];

function webgl(hash, callback) {
  try {
    const workValue = NanoWebglPow(hash, callback,
      n => {
        setStatus('Calculated ' + n + ' frames...');
        if (is_working == '') {
          console.log('Cancelled')
          setStatus('Waiting for work...');
          checkForWork()
          return true
        }
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
  console.log('Starting work on ' + hash)
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

function checkForWork() {
  if (work_cache.length > 0) {
    console.log('Found something in work cache, starting...')
    var randomWork = work_cache[Math.floor(Math.random() * work_cache.length)];

    is_working = randomWork.block_hash;
    generateWork(randomWork.block_hash, work => {
      returnWork(randomWork.block_hash, work, randomWork.work_type);
      is_working = '';
      checkForWork()
    });
  } else {
    console.log('Nothing in work cache')
  }
}

function setStatus(text) {
  $('#statusbtn').html('<i class="fas fa-spinner fa-spin"></i> ' + text);
}

form.addEventListener('submit', e => {
  e.preventDefault();

  // prevent double clicks
  if (inited) { return }
  inited = true;

  payout_address = form.elements[0].value;

  console.log('Payout: ', payout_address)

  client.subscribe([
    'work/#',
    'cancel/#',
    'client/#'
  ])

  //client.subscribe('#')

  setStatus('Waiting for work...');

  client.on("message", function (topic, payload) {
    payload = payload + ''

    var topic_split = topic.split('/')
    var message_type = topic_split[0]

    if (message_type == 'work') {
      setStatus('Starting work generation...');

      var splits = payload.split(',')

      var block_hash = splits[0]
      var difficulty = splits[1]
      var work_type = topic_split[1]

      console.log('work', work_type, block_hash, difficulty)

      if (is_working) {
        console.log('Already doing work...');
        work_cache.push({
          block_hash: block_hash,
          difficulty: difficulty,
          work_type: work_type
        })

      } else {
        is_working = block_hash;
        generateWork(block_hash, work => {
          returnWork(block_hash, work, work_type);
          is_working = '';
          checkForWork()
        });
      }

    } else if (message_type == 'heartbeat') {
      $('#last_heartbeat').text(new Date().toLocaleString());

    } else if (message_type == 'statistics') {
      console.log('statistics', topic_split, JSON.parse(payload))

    } else if (message_type == 'client') {
      console.log('client', topic_split, JSON.parse(payload))

    } else if (message_type == 'cancel') {
      console.log('cancel', topic_split, payload)
      if (payload == is_working) {
        console.log('Currently working, cancel')
        is_working = '';
      } else if (work_cache.some(e => e.block_hash === payload)) {
        console.log('In work cache, removing')
        work_cache = work_cache.filter(e => e.block_hash !== payload);
      }

    } else {
      console.log('Unknown type: ', topic, payload)

    }
  })

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