const year = 2025; // Example year; replace with your desired year
    const moodData = {
    "2025-01-01": "happy",
    "2025-01-02": "sad",
    // Add more entries as needed, e.g., "2023-01-03": "neutral"
    };

const testUser = 'andrews';
var userJson = {};

var userJournalHistory = [];




async function getJournalHistoryForUser(username) {

    console.log("hopping");
    // we can put the username in local storage but for now
    userName = d3.select("#username").property("value");
    console.log(`userName: ${userName}`);
    // make API call to get journal history, default to one year
    await d3.json(`http://127.0.0.1:8800/history/${userName}`).then(function(data) {
        console.log(data);
        userJson = data;

        userJournalHistory = data;
    });

}

function showWeekOverview(week) {

    var firstDate = week[0].toISOString().split("T")[0];
    var lastDate = week[week.length-1].toISOString().split("T")[0];

    buildJournalTimesliceList(firstDate, lastDate);

    const overview = d3.select("#week-overview");
    overview.html(""); // Clear previous content
    overview.append("h3").text("Week Overview");
    const list = overview.append("ul");
    week.forEach(function(date) {

        // recreate journal list with filter

        const dateStr = date.toISOString().split("T")[0];
        list.append("li").text(dateStr);
        
    });

    
}

function calculateCalendar(year) {


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

function buildCalenderWithD3(weeks){
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
    // get journal history for default date range on opening of container

    rows.each(function(week) {
    d3.select(this)
        .selectAll(".col")
        .data(week)
        .enter()
        .append("div")
        .attr("class", "col")
        .text(function(d) { return d.getDate(); })
        .classed("outside-year", function(d) { return d.getFullYear() !== year; })
    });
}

function buildJournalTimesliceList(startDate, endDate){
    
    const journalList = d3.select("#journalEntryList");
    journalList.html(""); // Clear previous content
    journalList.append("h3").text("Journal Entries");
    const list = journalList.append("ul");
    userJournalHistory.forEach(function(entry) {
        console.log(entry);
        var dateStr = new Date(entry["timestamp"]).toISOString().split("T")[0];

        console.log(startDate, endDate, dateStr);
        if(dateStr >= startDate && dateStr <= endDate){
            list.append("li").text(dateStr + " - " + entry["title"]);
        }
    });

}


function initHistory(){
    
    getJournalHistoryForUser();

    const weeks = calculateCalendar(year);
    buildCalenderWithD3(weeks);
    
}