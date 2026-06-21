(function () {
  return {
    label: 'Stats',
    render: function () {
      var html = '<div class="stats-app">';
      html += '<h2>Your Library Stats</h2>';
      html += '<p>This is a sample custom app. It demonstrates the custom app API.</p>';
      html += '<div class="stats-placeholder">';
      html += '<p>Use Litetify.library to fetch real data.</p>';
      html += '<button onclick="Litetify.library.getPlaylists().then(function(pl) {';
      html += "  var el = document.querySelector('.stats-placeholder');";
      html += "  if (el) el.innerHTML = '<ul>' + pl.map(function(p) { return '<li>' + p.name + '</li>'; }).join('') + '</ul>';";
      html += '})">Load Playlists</button>';
      html += '</div>';
      html += '</div>';
      return html;
    }
  };
})();
