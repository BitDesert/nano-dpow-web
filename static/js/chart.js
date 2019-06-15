var ctx = document.getElementById('chart');

var work_timing = [];

var myChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
        datasets: [{
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
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
      console.log('Got work, adding to work cache...');
      work_cache.push({
        block_hash: block_hash,
        difficulty: difficulty,
        work_type: work_type,
        startTime: new Date()
      })

  } else if (message_type == 'cancel') {
    console.log('cancel', topic_split, payload)

    if (work_cache.some(e => e.block_hash === payload)) {
      console.log('In work cache, removing')
      work_cache = work_cache.filter(e => e.block_hash !== payload);
    }

  }
})