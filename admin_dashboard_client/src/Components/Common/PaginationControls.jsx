import React from "react";
import PropTypes from "prop-types";
import "./PaginationControls.css"; // We'll create this CSS file for styling

/**
 * Renders pagination controls with Previous/Next buttons and page numbers.
 * Includes logic for handling many pages using ellipsis.
 *
 * @param {object} props - Component props.
 * @param {number} props.currentPage - The currently active page number.
 * @param {number} props.totalPages - The total number of pages available.
 * @param {function} props.onPageChange - Function called with the new page number when a page is clicked.
 * @param {number} [props.pageNeighbours=1] - How many page numbers to show on each side of the current page.
 */
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  pageNeighbours = 1,
}) => {
  // Don't render pagination if there's only one page or less
  if (totalPages <= 1) {
    return null;
  }

  /**
   * Helper function to generate the range of numbers to display.
   * e.g., range(1, 5) => [1, 2, 3, 4, 5]
   */
  const range = (from, to, step = 1) => {
    let i = from;
    const rangeArr = [];
    while (i <= to) {
      rangeArr.push(i);
      i += step;
    }
    return rangeArr;
  };

  const fetchPageNumbers = () => {
    const totalNumbers = pageNeighbours * 2 + 3; // Neighbours + first + last + current
    const totalBlocks = totalNumbers + 2; // Include space for ellipsis

    if (totalPages > totalBlocks) {
      const startPage = Math.max(2, currentPage - pageNeighbours);
      const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
      let pages = range(startPage, endPage);

      /**
       * hasLeftSpill: has hidden pages to the left
       * hasRightSpill: has hidden pages to the right
       */
      const hasLeftSpill = startPage > 2;
      const hasRightSpill = totalPages - endPage > 1;
      const spillOffset = totalNumbers - (pages.length + 1); // Adjust for missing pages

      switch (true) {
        // handle: (1) < {5 6} [7] {8 9} > (10)
        case hasLeftSpill && !hasRightSpill: {
          const extraPages = range(startPage - spillOffset, startPage - 1);
          pages = ["LEFT", ...extraPages, ...pages];
          break;
        }

        // handle: (1) < {2 3} [4] {5 6} > (...) (10)
        case !hasLeftSpill && hasRightSpill: {
          const extraPages = range(endPage + 1, endPage + spillOffset);
          pages = [...pages, ...extraPages, "RIGHT"];
          break;
        }

        // handle: (1) (...) < {4 5} [6] {7 8} > (...) (10)
        case hasLeftSpill && hasRightSpill:
        default: {
          pages = ["LEFT", ...pages, "RIGHT"];
          break;
        }
      }
      // Always include the first and last page
      return [1, ...pages, totalPages];
    }

    // If total pages is not greater than the blocks needed, return all page numbers
    return range(1, totalPages);
  };

  const pageNumbers = fetchPageNumbers();

  return (
    <nav aria-label="Page navigation" className="pagination-container">
      <ul className="pagination-list">
        {/* Previous Button */}
        <li
          className={`pagination-item ${currentPage === 1 ? "disabled" : ""}`}
        >
          <button
            className="pagination-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous Page"
          >
            « {/* Previous Symbol */}
          </button>
        </li>

        {/* Page Number Buttons */}
        {pageNumbers.map((page, index) => {
          if (page === "LEFT" || page === "RIGHT") {
            // Render ellipsis
            return (
              <li
                key={`ellipsis-${index}`}
                className="pagination-item disabled"
              >
                <span className="pagination-link ellipsis">…</span>
              </li>
            );
          }

          // Render actual page number button
          return (
            <li
              key={page}
              className={`pagination-item ${
                currentPage === page ? "active" : ""
              }`}
            >
              <button
                className="pagination-link"
                onClick={() => onPageChange(page)}
                disabled={currentPage === page} // Disable the current page button
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          );
        })}

        {/* Next Button */}
        <li
          className={`pagination-item ${
            currentPage === totalPages ? "disabled" : ""
          }`}
        >
          <button
            className="pagination-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next Page"
          >
            » {/* Next Symbol */}
          </button>
        </li>
      </ul>
    </nav>
  );
};

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  pageNeighbours: PropTypes.number, // Optional: default is 1
};

export default PaginationControls;
