var work_timing = [];

var lastWorkChart = new Chart(document.getElementById('lastWorkChart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'On Demand',
      data: [],
      backgroundColor: '#f44336',
      borderColor: '#f44336',
      borderWidth: 1,
      fill: false
    },
    {
      label: 'Precache',
      data: [],
      backgroundColor: '#2196F3',
      borderColor: '#2196F3',
      borderWidth: 1,
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      yAxes: [{
        display: true,
        ticks: {
          beginAtZero: true
        },
        scaleLabel: {
          display: true,
          labelString: 'Time in ms'
        }
      }]
    }
  }
});

for (let i = 25; i > 0; i--) {
  lastWorkChart.data.labels.push(i)
  lastWorkChart.data.datasets.forEach((dataset) => {
      dataset.data.push(0);
  });
  lastWorkChart.update();
}

client.on("message", function (topic, payload) {
  if(document.getElementById("enablegraph").checked == false) return

  payload = payload + ''

  var topic_split = topic.split('/')
  var message_type = topic_split[0]

  if (message_type == 'work') {
    var splits = payload.split(',')

    var block_hash = splits[0]
    var difficulty = splits[1]
    var work_type = topic_split[1]
    
    work_timing.push({
      block_hash: block_hash,
      difficulty: difficulty,
      work_type: work_type,
      startTime: new Date()
    })

  } else if (message_type == 'cancel') {
    if (work_timing.some(e => e.block_hash === payload)) {

      var block = work_timing.filter(e => e.block_hash === payload)[0];
      var datediff = new Date() - block.startTime;

      console.log('Work is done for ' + payload + ' in ' + datediff + ' ms (' + block.work_type + ')')

      if(block.work_type == 'ondemand'){
        var dataset = 0;
      } else {
        var dataset = 1;
      }

      //lastWorkChart.data.labels.push(payload.slice(-4))
      lastWorkChart.data.datasets[dataset].data.push(datediff)
      
      if (lastWorkChart.data.datasets[dataset].data.length > 25) {
        //lastWorkChart.data.labels.shift();
        lastWorkChart.data.datasets[dataset].data.shift();
      }

      lastWorkChart.update();

      work_timing = work_timing.filter(e => e.block_hash !== payload);
    }

  }
})
