import { describe, it, expect } from "vitest";
import { parseCSV } from "@/lib/csv-parser";

describe("parseCSV", () => {
  it("parses standard column names", () => {
    const csv = `rating,title,body,date,reviewer,verified
5,Great product,Loved it,2026-01-15,John,true
3,Okay,It was fine,2026-01-16,Jane,false`;

    const reviews = parseCSV(csv);

    expect(reviews).toHaveLength(2);
    expect(reviews[0].rating).toBe(5);
    expect(reviews[0].title).toBe("Great product");
    expect(reviews[0].body).toBe("Loved it");
    expect(reviews[0].reviewer).toBe("John");
    expect(reviews[0].verified).toBe(true);
    expect(reviews[1].rating).toBe(3);
    expect(reviews[1].verified).toBe(false);
  });

  it("supports alternative column names (Rating, stars, Text, Author)", () => {
    const csv = `stars,headline,Text,Date,Author,Verified
4,Nice,Works well,2026-02-01,Alice,true`;

    const reviews = parseCSV(csv);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].rating).toBe(4);
    expect(reviews[0].title).toBe("Nice");
    expect(reviews[0].body).toBe("Works well");
    expect(reviews[0].reviewer).toBe("Alice");
  });

  it("clamps ratings to 0-5 range", () => {
    const csv = `rating,title,body,date,reviewer,verified
10,Too high,Over the max,2026-01-01,Bob,false
-2,Too low,Under the min,2026-01-01,Carol,false`;

    const reviews = parseCSV(csv);

    expect(reviews[0].rating).toBe(5);
    expect(reviews[1].rating).toBe(0);
  });

  it("defaults reviewer to Anonymous when missing", () => {
    const csv = `rating,title,body,date
4,Good,Nice product,2026-03-01`;

    const reviews = parseCSV(csv);

    expect(reviews[0].reviewer).toBe("Anonymous");
  });

  it("generates unique IDs for each review", () => {
    const csv = `rating,title,body,date,reviewer,verified
5,A,Body A,2026-01-01,X,false
5,B,Body B,2026-01-02,Y,false`;

    const reviews = parseCSV(csv);

    expect(reviews[0].id).toBeDefined();
    expect(reviews[1].id).toBeDefined();
    expect(reviews[0].id).not.toBe(reviews[1].id);
  });

  it("handles empty CSV gracefully", () => {
    const csv = `rating,title,body,date,reviewer,verified`;
    const reviews = parseCSV(csv);
    expect(reviews).toHaveLength(0);
  });

  it("trims whitespace from field values", () => {
    const csv = `rating,title,body,date,reviewer,verified
5,  Spacey Title  ,  Spacey Body  ,2026-01-01,  Spacey Name  ,false`;

    const reviews = parseCSV(csv);

    expect(reviews[0].title).toBe("Spacey Title");
    expect(reviews[0].body).toBe("Spacey Body");
    expect(reviews[0].reviewer).toBe("Spacey Name");
  });
});
