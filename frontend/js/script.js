// Configuration
const API_BASE_URL = "http://localhost:5000/api";
const ROWS_PER_PAGE = 10;
const MAX_PAGE_NUMBERS = 5;

// State variables
let currentQuery = "";
let currentCategory = "";
let currentPage = 1;
let totalResults = 0;
let currentSort = "";
let isFirstSearch = true;

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const clearSearchButton = document.getElementById("clear-search");
const resultsContainer = document.getElementById("results-container");
const resultCount = document.getElementById("result-count");
const searchTime = document.getElementById("search-time");
const categoryFilters = document.getElementById("category-filters");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageNumbers = document.getElementById("page-numbers");
const loadingIndicator = document.getElementById("loading");

// Initialize the application
function init() {
  loadCategories();
  setupEventListeners();
  setupAutocomplete();

  // Check URL parameters for initial search
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get("q");
  const categoryParam = urlParams.get("category");
  const pageParam = urlParams.get("page");
  const sortParam = urlParams.get("sort");

  if (queryParam) {
    searchInput.value = queryParam;
    currentQuery = queryParam;

    if (categoryParam) {
      currentCategory = categoryParam;
    }

    if (pageParam && !isNaN(parseInt(pageParam))) {
      currentPage = parseInt(pageParam);
    }

    if (sortParam) {
      currentSort = sortParam;
      document.querySelector(
        `input[name="sort"][value="${sortParam}"]`
      ).checked = true;
    }

    executeSearch();
  }
}

// Load categories from Solr for filters
function loadCategories() {
  fetch(`${API_BASE_URL}/categories`)
    .then((response) => response.json())
    .then((categories) => {
      if (categories.length === 0) {
        categoryFilters.innerHTML = "<p>No categories found</p>";
        return;
      }

      let html = "";
      categories.forEach((category) => {
        const isChecked = currentCategory === category.name ? "checked" : "";

        html += `
                    <div class="category-item">
                        <input type="radio" name="category" id="cat-${category.name}" 
                               value="${category.name}" ${isChecked}>
                        <label for="cat-${category.name}">${category.name}</label>
                        <span class="category-count">${category.count}</span>
                    </div>
                `;
      });

      // Add "All Categories" option
      const isAllChecked = currentCategory === "" ? "checked" : "";
      html =
        `
                <div class="category-item">
                    <input type="radio" name="category" id="cat-all" value="" ${isAllChecked}>
                    <label for="cat-all">All Categories</label>
                </div>
            ` + html;

      categoryFilters.innerHTML = html;

      // Add event listeners to category filters
      document.querySelectorAll('input[name="category"]').forEach((input) => {
        input.addEventListener("change", function () {
          currentCategory = this.value;
          currentPage = 1;
          executeSearch();
          updateUrlParams();
        });
      });
    })
    .catch((error) => {
      console.error("Error loading categories:", error);
      categoryFilters.innerHTML = "<p>Error loading categories</p>";
    });
}

// Set up event listeners
function setupEventListeners() {
  // Search button click
  searchButton.addEventListener("click", function () {
    if (searchInput.value !== currentQuery || isFirstSearch) {
      currentQuery = searchInput.value;
      currentPage = 1;
      executeSearch();
      updateUrlParams();
    }
  });

  // Enter key in search input
  searchInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      if (searchInput.value !== currentQuery || isFirstSearch) {
        currentQuery = searchInput.value;
        currentPage = 1;
        executeSearch();
        updateUrlParams();
      }
    }

    // Show/hide clear button
    clearSearchButton.style.display = searchInput.value ? "block" : "none";
  });

  // Clear search button
  clearSearchButton.addEventListener("click", function () {
    searchInput.value = "";
    searchInput.focus();
    clearSearchButton.style.display = "none";
  });

  // Pagination
  prevPageBtn.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      executeSearch();
      updateUrlParams();
      window.scrollTo(0, 0);
    }
  });

  nextPageBtn.addEventListener("click", function () {
    currentPage++;
    executeSearch();
    updateUrlParams();
    window.scrollTo(0, 0);
  });

  // Sort options
  document.querySelectorAll('input[name="sort"]').forEach((input) => {
    input.addEventListener("change", function () {
      currentSort = this.value;
      currentPage = 1;
      executeSearch();
      updateUrlParams();
    });
  });

  // Initial state of clear button
  clearSearchButton.style.display = searchInput.value ? "block" : "none";
}

// Update URL parameters to reflect current search state
function updateUrlParams() {
  const params = new URLSearchParams();

  if (currentQuery) {
    params.set("q", currentQuery);
  }

  if (currentCategory) {
    params.set("category", currentCategory);
  }

  if (currentPage > 1) {
    params.set("page", currentPage);
  }

  if (currentSort) {
    params.set("sort", currentSort);
  }

  const newUrl = `${window.location.pathname}${
    params.toString() ? "?" + params.toString() : ""
  }`;
  history.pushState({}, "", newUrl);
}

// Set up autocomplete using jQuery UI with enhanced styling
function setupAutocomplete() {
  $(searchInput)
    .autocomplete({
      source: function (request, response) {
        fetch(
          `${API_BASE_URL}/autocomplete?term=${encodeURIComponent(
            request.term
          )}`
        )
          .then((res) => res.json())
          .then((data) => {
            response(data);
          })
          .catch((error) => {
            console.error("Autocomplete error:", error);
            response([]);
          });
      },
      minLength: 2,
      select: function (event, ui) {
        searchInput.value = ui.item.value;
        currentQuery = ui.item.value;
        currentPage = 1;
        executeSearch();
        updateUrlParams();
        return false;
      },
    })
    .data("ui-autocomplete")._renderItem = function (ul, item) {
    // Custom rendering of autocomplete items with icons
    let icon = "search";
    if (item.category === "category") {
      icon = "category";
    } else if (item.category === "title") {
      icon = "article";
    }

    return $("<li>")
      .append(
        `<div><span class="material-icons">${icon}</span>${item.label}</div>`
      )
      .appendTo(ul);
  };
}

// Execute search with current parameters
function executeSearch() {
  // Hide welcome message
  document.querySelector(".welcome-message")?.classList.add("hidden");

  // Show loading indicator
  loadingIndicator.classList.remove("hidden");

  // Calculate start position for pagination
  const start = (currentPage - 1) * ROWS_PER_PAGE;

  // Build query URL
  let queryUrl = `${API_BASE_URL}/search?start=${start}&rows=${ROWS_PER_PAGE}`;

  // Only add query if it's not empty
  if (currentQuery) {
    queryUrl += `&q=${encodeURIComponent(currentQuery)}`;
  } else {
    queryUrl += `&q=*:*`;
  }

  // Execute search with current parameters (continued)
  if (currentCategory) {
    queryUrl += `&category=${encodeURIComponent(currentCategory)}`;
  }

  if (currentSort) {
    queryUrl += `&sort=${encodeURIComponent(currentSort)}`;
  }

  // Start time for search performance measurement
  const startTime = performance.now();

  // Fetch results from API
  fetch(queryUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Search request failed");
      }
      return response.json();
    })
    .then((data) => {
      const endTime = performance.now();
      const searchDuration = ((endTime - startTime) / 1000).toFixed(2);

      renderResults(data);
      updatePagination(data.response.numFound);
      searchTime.textContent = `(${searchDuration} seconds)`;
      loadingIndicator.classList.add("hidden");
      isFirstSearch = false;
    })
    .catch((error) => {
      console.error("Search error:", error);
      resultsContainer.innerHTML = `
                <div class="error-message">
                    <p>Sorry, an error occurred while searching. Please try again.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
      loadingIndicator.classList.add("hidden");
    });
}

// Render search results
function renderResults(data) {
  // Debug log
  console.log("Search result data:", data);

  if (!data || !data.response) {
    resultsContainer.innerHTML = `
            <div class="error-message">
                <p>Sorry, received an invalid response from the server.</p>
                <p class="error-details">Response doesn't contain 'response' object.</p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
    return;
  }

  if (!data.response.docs) {
    resultsContainer.innerHTML = `
            <div class="error-message">
                <p>Sorry, received an invalid response from the server.</p>
                <p class="error-details">Response doesn't contain 'docs' array.</p>
                <pre>${JSON.stringify(data.response, null, 2)}</pre>
            </div>
        `;
    return;
  }

  const { docs, numFound } = data.response;

  // Update result count
  resultCount.textContent = numFound;
  totalResults = numFound;

  // Clear previous results
  resultsContainer.innerHTML = "";

  if (docs.length === 0) {
    resultsContainer.innerHTML = `
            <div class="no-results">
                <span class="material-icons">search_off</span>
                <h3>No results found</h3>
                <p>Try different keywords or remove filters</p>
            </div>
        `;
    return;
  }

  // Render each document
  docs.forEach((doc) => {
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";

    // Get title with highlighting if available
    let title = doc.title || "Untitled Document";
    if (
      data.highlighting &&
      data.highlighting[doc.id] &&
      data.highlighting[doc.id].title
    ) {
      title = data.highlighting[doc.id].title[0];
    }

    // Get author if available
    const author = doc.author || "Unknown Author";

    // Get category if available
    const category = doc.category || "Uncategorized";

    // Get published status if available
    const publishedStatus =
      typeof doc.published !== "undefined"
        ? doc.published
          ? "Published"
          : "Draft"
        : "";

    resultItem.innerHTML = `
            <div class="result-title">${title}</div>
            <div class="result-metadata">
                <span class="result-author">
                    <span class="material-icons">person</span>${author}
                </span>
                <span class="result-category">
                    <span class="material-icons">tag</span>${category}
                </span>
                ${
                  publishedStatus
                    ? `<span class="result-status">
                        <span class="material-icons">public</span>${publishedStatus}
                    </span>`
                    : ""
                }
            </div>
        `;

    resultsContainer.appendChild(resultItem);
  });
}

// Update pagination controls
function updatePagination(numFound) {
  const totalPages = Math.ceil(numFound / ROWS_PER_PAGE);

  // Update button states
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;

  // Generate page numbers
  pageNumbers.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  // Calculate start and end page numbers to display
  let startPage = Math.max(1, currentPage - Math.floor(MAX_PAGE_NUMBERS / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGE_NUMBERS - 1);

  // Adjust start page if necessary
  if (endPage - startPage + 1 < MAX_PAGE_NUMBERS) {
    startPage = Math.max(1, endPage - MAX_PAGE_NUMBERS + 1);
  }

  // Add first page button if needed
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) {
      addEllipsis();
    }
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }

  // Add last page button if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      addEllipsis();
    }
    addPageButton(totalPages);
  }

  function addPageButton(pageNum) {
    const pageButton = document.createElement("div");
    pageButton.className =
      "page-number" + (pageNum === currentPage ? " active" : "");
    pageButton.textContent = pageNum;

    if (pageNum !== currentPage) {
      pageButton.addEventListener("click", () => {
        currentPage = pageNum;
        executeSearch();
        updateUrlParams();
        window.scrollTo(0, 0);
      });
    }

    pageNumbers.appendChild(pageButton);
  }

  function addEllipsis() {
    const ellipsis = document.createElement("div");
    ellipsis.className = "page-ellipsis";
    ellipsis.textContent = "...";
    pageNumbers.appendChild(ellipsis);
  }
}

// Helper function to truncate text with ellipsis
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Format date to readable string
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
}

// Debug function to inspect Solr's schema
function inspectSchema() {
  fetch(`${API_BASE_URL}/fields`)
    .then((response) => response.json())
    .then((data) => {
      console.log("Solr schema fields:", data);
    })
    .catch((error) => {
      console.error("Error fetching schema:", error);
    });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
