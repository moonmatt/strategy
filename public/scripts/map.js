const mapComponent = () => {
    let map = document.getElementById('map')
    let width = map.offsetWidth
    let height = map.offsetHeight
    let xSquares = 20
    let ySquares = 10
    let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

    let y
    for (y = 0; y < ySquares; y++){
        let i;
        let row = document.createElement('div')
        row.className = 'customRow'
        row.id = 'row' + y
        map.appendChild(row)

        for (i = 0; i < xSquares; i++) {
            let currentRow = document.getElementById('row' + y)
            let square = document.createElement('div')
            square.id = alphabet[y] + i
            square.className = 'square'
            square.style.width = Math.floor(width/xSquares) + 'px'
            square.style.height = Math.floor(width/xSquares) + 'px'
            currentRow.appendChild(square)
        } 
    }
}
export { mapComponent }