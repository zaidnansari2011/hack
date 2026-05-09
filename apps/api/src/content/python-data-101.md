---
title: Python for Data Analysis
slug: python-data-101
---

# Pandas: the DataFrame mental model

A `DataFrame` is a labeled, two-dimensional table — like a spreadsheet but with named columns and indexed rows. Internally, each column is a one-dimensional `Series` backed by a NumPy array, which is why pandas is fast on numeric data and slow on per-row Python loops.

Three operations cover 80% of real analysis: **selection** (`df[df.age > 30]` filters rows where the age column is over thirty), **aggregation** (`df.groupby("city")["revenue"].sum()` totals revenue per city), and **joining** (`pd.merge(orders, customers, on="customer_id")` stitches two tables on a shared key). Once these feel automatic, most "real" data work is composing them.

Indexing is where most beginners stumble. `df.loc[row_label, col_label]` is label-based; `df.iloc[row_pos, col_pos]` is positional. Mixing them silently produces wrong answers. Stick to `loc` for filtering, `iloc` only when you genuinely need positions (head/tail logic).

# Reading messy data

Real datasets arrive broken. `pd.read_csv` has 50+ parameters because every CSV is dirty in its own way. The four you'll use most: `parse_dates=["date_col"]` (turns string dates into proper timestamps), `dtype={"id": str}` (forces an ID column to stay as text so leading zeros aren't lost), `na_values=["N/A", "-", "?"]` (treats those strings as missing), and `usecols=["a","b","c"]` (skips columns you don't need — saves memory on wide files).

Excel and Parquet are similar: `read_excel` for spreadsheets, `read_parquet` for the columnar binary format used by data warehouses. Parquet is dramatically faster than CSV for big tables (often 10–50x for selective queries) because it only reads the columns you ask for.

After loading, run `df.info()` (memory + dtypes), `df.describe()` (numeric summary), and `df.isna().sum()` (missing values per column). These three calls catch most data quality problems before they become wrong charts.

# Cleaning and transforming

Missing data has three sensible treatments and one wrong one. Drop the row (`df.dropna()`) when missingness is rare and random. Fill with a sentinel (`df.fillna(0)`, `df.fillna("Unknown")`) when the absence has meaning. Impute (`df["age"].fillna(df["age"].median())`) when you need a complete column for downstream modeling. The wrong one: silently letting NaN propagate into aggregations, which gives undefined results that look real.

Type coercion: `pd.to_numeric(s, errors="coerce")` turns a messy string column into floats, with non-parseable entries becoming NaN. Same idea with `pd.to_datetime`. The `errors="coerce"` flag is the difference between a clean pipeline and a 3am debugging session.

For text, the `.str` accessor is your friend: `df["name"].str.lower().str.strip()` is the canonical normalize-emails pattern. Regex works through `.str.contains`, `.str.extract`, and `.str.replace` — slower than vectorized math but still 100x faster than a Python loop.

# Group-by and pivot

`groupby` is the workhorse. The full pattern is split-apply-combine: split rows into groups by a key, apply a function to each group, combine the results back into a DataFrame.

`df.groupby("country").agg(revenue_sum=("revenue", "sum"), order_count=("order_id", "count"))` produces a tidy table with one row per country and named output columns. The named-aggregation form (`new_col=("source", "func")`) is dramatically more readable than the older syntax and survives column reordering.

`pivot_table` is groupby with a wide layout: one variable becomes rows, another becomes columns, a third is aggregated in the cells. `df.pivot_table(index="month", columns="region", values="sales", aggfunc="sum")` gives the classic month × region sales matrix. Add `margins=True` to get row and column totals automatically.

# Visualization with matplotlib

Matplotlib is the foundation. Every other Python plotting library — seaborn, plotnine, even pandas' built-in `.plot()` — is a wrapper that calls matplotlib underneath. Learning the base layer pays off because every other tool can be customized once you understand it.

The mental model: a `Figure` is the whole page; `Axes` are the individual plotting regions on it. `fig, ax = plt.subplots()` gives you both. From there, every plot type is a method on `ax`: `ax.plot(x, y)`, `ax.bar(x, h)`, `ax.scatter(x, y)`, `ax.hist(values, bins=30)`. Set labels (`ax.set_xlabel`), titles (`ax.set_title`), and limits (`ax.set_xlim`) explicitly — the defaults are rarely what you want for a finished chart.

For multiple panels: `fig, axes = plt.subplots(2, 2, figsize=(10, 8))` and then `axes[0, 0].plot(...)`. This composes naturally with a for-loop over `axes.flat` and a list of columns to plot.

For publication-quality output: use `plt.savefig("out.png", dpi=300, bbox_inches="tight")`. The `bbox_inches="tight"` is the difference between cropped labels and a clean image.

# Time series basics

Pandas' time-series support is best-in-class. Once a DataFrame's index is a `DatetimeIndex`, you get superpowers: slicing by date strings (`df["2025-Q1"]`), resampling to a different frequency (`df.resample("W").sum()` for weekly totals), and rolling windows (`df["sales"].rolling(7).mean()` for a 7-day moving average).

Time-zone handling deserves dedicated attention. Naive timestamps (no timezone) are a footgun in any dataset that crosses regions or DST boundaries. Localize with `df.index.tz_localize("UTC")` immediately after loading, then convert to display zones with `.tz_convert("Asia/Kolkata")` only at the presentation layer.

For seasonality, decompose with `statsmodels.tsa.seasonal_decompose` — it splits a series into trend, seasonal, and residual components, and a glance at the four-panel chart usually tells you whether the pattern you think you see is real.

# Working in Jupyter

Jupyter notebooks are the default analytical workbench for a reason: you can run a query, see the head, transform, and replot in seconds. The price is statefulness — out-of-order execution silently corrupts results, and a notebook that "works" might have come from running cells out of order.

Discipline that prevents 80% of pain: always restart and run-all before sharing or trusting a result. Top of the notebook imports first. Variable names short (`df`, `s`) inside cells, descriptive (`monthly_revenue`) for things that survive across cells. Long results (`df.describe()`, `df.info()`) get a comment above them explaining what you were checking — future-you reading this in three months will not remember.

For code that gets reused, move it from the notebook into a `.py` module and `from helpers import clean_orders`. The notebook should call functions; it shouldn't define them past a quick prototype.

# When pandas isn't enough

Pandas runs in a single process and holds the whole DataFrame in RAM. At a few gigabytes it slows down; at tens of gigabytes it crashes. The escape hatches, in order of effort:

`pd.read_csv(..., chunksize=100_000)` returns an iterator of small DataFrames — process one at a time, write results, never load the whole file. Works for any aggregation that's reducible (sums, counts, top-K).

`polars` is a Rust-based DataFrame library with a near-pandas API and lazy evaluation. Real-world speedups of 5–30x are common; for a wide groupby on a few-GB file, often 100x.

`duckdb` runs SQL directly on Parquet files (or DataFrames) without a server — `duckdb.sql("SELECT country, SUM(revenue) FROM 'orders.parquet' GROUP BY 1").df()`. Extremely fast and pleasant when your problem is naturally expressed as a query.

For genuinely big data (terabytes), the conversation shifts to BigQuery, Snowflake, or Spark — but it's worth running through chunked pandas / polars / duckdb first, because most "big data" problems aren't.
