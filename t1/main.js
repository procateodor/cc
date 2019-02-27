const btn = document.getElementById("generate");
const container = document.getElementById('container');

btn.onclick = () => {
  $.ajax({
      method: 'GET',
      url: 'http://127.0.0.1:6969/api/t1',
      success: data => {
          const response = JSON.parse(data);

          container.innerHTML += `
            <div class="col-md-3">
                <div class="card-container">
                    <img src="${response.mesagge}" alt="photo">
                </div>
            </div>
          `;
      }
  })
};
