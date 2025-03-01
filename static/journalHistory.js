const year = 2023; // Example year; replace with your desired year
    const moodData = {
    "2025-01-01": "happy",
    "2025-01-02": "sad",
    // Add more entries as needed, e.g., "2023-01-03": "neutral"
    };

    function showWeekOverview(week) {
        const overview = d3.select("#week-overview");
        overview.html(""); // Clear previous content
        overview.append("h3").text("Week Overview");
        const list = overview.append("ul");
        week.forEach(function(date) {
            const dateStr = date.toISOString().split("T")[0];
            list.append("li").text(dateStr);


            
        });
    }
    function generateCalendar(year) {
        // First day of the year
        const firstDay = new Date(year, 0, 1);
        const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOffset = dayOfWeek; // Days to subtract to reach previous Sunday

        // Last day of the year
        const lastDay = new Date(year, 11, 31);
        const endDayOfWeek = lastDay.getDay();
        const endOffset = 6 - endDayOfWeek; // Days to add to reach next Saturday

        // Total days including offsets
        const daysInYear = (lastDay - firstDay) / (1000 * 60 * 60 * 24) + 1;
        const totalDays = daysInYear + startOffset + endOffset;

        // Start date is first Sunday on or before January 1
        const startDate = new Date(year, 0, 1 - startOffset);

        // Generate all dates
        const dates = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date);
        }

        // Group into weeks
        const weeks = [];
        for (let i = 0; i < dates.length; i += 7) {
            weeks.push(dates.slice(i, i + 7));
        }

        return weeks;
        }

        const weeks = generateCalendar(year);
        const calendar = d3.select("#calendar");

        // Create rows for each week
        const rows = calendar.selectAll(".row")
        .data(weeks)
        .enter()
        .append("div")
        .attr("class", "row")
        .on("click", function(event, d) {
            showWeekOverview(d);
        });

        // Create cells for each day within each row
        rows.each(function(week) {
        d3.select(this)
            .selectAll(".col")
            .data(week)
            .enter()
            .append("div")
            .attr("class", "col")
            .text(function(d) { return d.getDate(); })
            .classed("outside-year", function(d) { return d.getFullYear() !== year; })
            .classed(function(d) {
            const dateStr = d.toISOString().split("T")[0];
            const mood = moodData[dateStr];
            return mood ? mood : "no-mood";
            }, true);
        });