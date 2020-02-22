var rotate = function(matrix) {
  let result = [];
  let array = [];
  let i = 0;
  while (i < matrix.length) {
    for (let index = 0; index < matrix.length; index++) {
      array.push(matrix[index][i]);
    }
    i++;
    result.push(array.reverse());
    array = [];
  }
  for (let index = 0; index < result.length; index++) {
    matrix[index] = result[index];
  }

  
};

console.log(
  rotate([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ])
);
