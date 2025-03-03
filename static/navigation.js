// navigation link handler
d3.selectAll('.nav-link').on('click', function(event) {
    console.log('nav link clicked');   

    event.preventDefault();
    const target = d3.select(this).text().trim();

    console.log(target);
    if (target === 'Home') {
        d3.select('#journalEntryContainer').classed('d-none', false);
        d3.select('#journalHistoryContainer').classed('d-none', true);
    } else if (target === 'History') {

        // hmm, TODO:  REFACTOR
        // make API call to get journal history, default to one year

        initHistory();
        
        d3.select('#journalEntryContainer').classed('d-none', true);
        d3.select('#journalHistoryContainer').classed('d-none', false);
    }
});