```js
//  analyze and extract select options
function analyzeAndExtractSelectOptions(selectElement, searchValue) {
  // Array to store each option's value and text.
  const optionsData = [];

  // Initialize foundIndex as null (indicating no search performed).
  let foundIndex = null;

  // Get total number of options.
  const totalOptions = selectElement.options.length;

  // Iterate through each option.
  for (let i = 0; i < totalOptions; i++) {
    const option = selectElement.options[i];

    // Save option data.
    optionsData.push({
      value: option.value,
      text: option.text,
    });

    // If searchValue is provided and match hasn't been found yet.
    if (typeof searchValue !== "undefined" && foundIndex === null) {
      if (option.value === searchValue) {
        foundIndex = i;
      }
    }
  }

  // If searchValue was provided but no match was found, set foundIndex to -1.
  if (typeof searchValue !== "undefined" && foundIndex === null) {
    foundIndex = -1;
  }

  return {
    optionsData,
    totalOptions,
    foundIndex,
  };
}

//  get element HTML from server
await fetch(
  "../wp-content/themes/lightnovel_1.1.5_current/template-parts/single/list_1.php",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      seri: 217137,
    }),
  }
).then((e) => e.text());
```
