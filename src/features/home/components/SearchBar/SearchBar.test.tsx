import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { vi } from "vitest";
import { SearchBar } from "./SearchBar";

// Mock Next.js useRouter hook
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockPush = vi.fn();
(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
  push: mockPush,
});

describe("SearchBar", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders with default placeholder text", () => {
    render(<SearchBar />);

    expect(
      screen.getByPlaceholderText("Bạn muốn tìm bánh gì hôm nay?"),
    ).toBeInTheDocument();
  });

  it("renders with custom placeholder text", () => {
    const customPlaceholder = "Tìm bánh tùy chỉnh";
    render(<SearchBar placeholder={customPlaceholder} />);

    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });

  it("navigates to /search when clicked", () => {
    render(<SearchBar />);

    const searchButton = screen.getByRole("button");
    fireEvent.click(searchButton);

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("navigates to /search when Enter key is pressed", () => {
    render(<SearchBar />);

    const searchButton = screen.getByRole("button");
    fireEvent.keyDown(searchButton, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("navigates to /search when Space key is pressed", () => {
    render(<SearchBar />);

    const searchButton = screen.getByRole("button");
    fireEvent.keyDown(searchButton, { key: " " });

    expect(mockPush).toHaveBeenCalledWith("/search");
  });

  it("meets minimum 48px height requirement", () => {
    render(<SearchBar />);

    const searchButton = screen.getByRole("button");
    expect(searchButton).toHaveClass("min-h-[48px]");
  });

  it("has proper accessibility attributes", () => {
    render(<SearchBar />);

    const searchButton = screen.getByRole("button");
    expect(searchButton).toHaveAttribute(
      "aria-label",
      "Tìm kiếm bánh: Bạn muốn tìm bánh gì hôm nay?",
    );
    expect(searchButton).toHaveAttribute("tabIndex", "0");
  });

  it("renders search icon", () => {
    render(<SearchBar />);

    // Check if search icon SVG is present
    const searchIcon = screen.getByRole("button").querySelector("svg");
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toHaveAttribute("aria-hidden", "true");
  });

  it("input field is readonly and not focusable", () => {
    render(<SearchBar />);

    const inputField = screen.getByPlaceholderText(
      "Bạn muốn tìm bánh gì hôm nay?",
    );
    expect(inputField).toHaveAttribute("readOnly");
    expect(inputField).toHaveAttribute("tabIndex", "-1");
    expect(inputField).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className", () => {
    const customClass = "custom-search-class";
    render(<SearchBar className={customClass} />);

    const searchButton = screen.getByRole("button");
    expect(searchButton).toHaveClass(customClass);
  });
});
