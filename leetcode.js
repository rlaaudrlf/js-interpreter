var generateParenthesis = function(n, result, currentStr, count) {
  result = result || [];
  currentStr = currentStr || "";
  count = count || 0;
  if (n < 0) {
    return result;
  }

  if (n === 0 && currentStr) {
    for (let index = 0; index < count; index++) {
      currentStr += ")";
    }

    result.push(currentStr);
    return result;
  }

  if (n >= 0) {
    generateParenthesis(n - 1, result, currentStr + "(", count + 1);
  }

  if (currentStr && count > 0) {
    generateParenthesis(n, result, currentStr + ")", count - 1);
  }

  return result;
};

console.log(generateParenthesis(3));
