var work_timing = [];

var lastWorkChart = new Chart(document.getElementById('lastWorkChart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Time in ms',
      data: [],
      backgroundColor: '#f44336',
      borderColor: '#f44336',
      borderWidth: 1,
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          scaleLabel: {
            display: true,
            labelString: 'Time in ms'
          }
        }
      }]
    }
  }
});

client.on("message", function (topic, payload) {
  payload = payload + ''

  var topic_split = topic.split('/')
  var message_type = topic_split[0]

  if (message_type == 'work') {
    var splits = payload.split(',')

    var block_hash = splits[0]
    var difficulty = splits[1]
    var work_type = topic_split[1]

    console.log('work', work_type, block_hash, difficulty)
    console.log('Got work, adding to work timing...');
    work_timing.push({
      block_hash: block_hash,
      difficulty: difficulty,
      work_type: work_type,
      startTime: new Date()
    })

  } else if (message_type == 'cancel') {
    console.log('cancel', topic_split, payload)

    if (work_timing.some(e => e.block_hash === payload)) {

      var datediff = new Date() - work_timing.filter(e => e.block_hash === payload)[0].startTime;

      console.log('Work is done for ' + payload + ' in ' + datediff + ' ms')

      if (lastWorkChart.data.labels.length > 25) {
        lastWorkChart.data.labels.shift();
        lastWorkChart.data.datasets[0].data.shift();
      }

      lastWorkChart.data.labels.push(payload.slice(-4))
      lastWorkChart.data.datasets[0].data.push(datediff)

      lastWorkChart.update();

      work_timing = work_timing.filter(e => e.block_hash !== payload);
    }

  }
})