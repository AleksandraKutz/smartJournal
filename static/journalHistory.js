const year = 2025; // Example year; replace with your desired year


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



    const firstDay = new Date(year, 0, 1);

    const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOffset = dayOfWeek; // Days to subtract to reach previous Sunday

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

function checkMoodScore(date){
    console.log("Checking mood score");
    console.log(date.toISOString().split("T")[0]);

    var moods = {"happiness": 0, "sadness": 0, "anger": 0, "fear": 0, "disgust": 0, "surprise": 0};

    console.log(userJournalHistory);
    userJournalHistory.forEach(function(entry) {

        var dateStr = new Date(entry["timestamp"]).toISOString().split("T")[0];
        console.log(dateStr, date.toISOString().split("T")[0]);

        if(dateStr == date.toISOString().split("T")[0]){
            console.log("MATCH");
            for(var mood in entry["classification"]["emotions"]){
                if(mood["emotion"]=="Happiness"){
                    console.log("sdcscdscdc");
                    moods[mood["emotion"]] = mood["intensity"];
                }
            }
        }
    });
      
    if(moods["happiness"] > 255){
        moods["happiness"] = 255;
    }


    return `rgb(${moods["happiness"]},0,0)`;
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
            .style("background-color", function(d) { return checkMoodScore(d)}) 
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


async function initHistory(){
    
    await getJournalHistoryForUser();

    const weeks = calculateCalendar(year);
    buildCalenderWithD3(weeks);
    
}