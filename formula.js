module.exports = (pipe) => {
    const { model } = pipe;
    const reportModel = model;
    const { plans } = reportModel;
    reportModel.hasMRB = plans[0].classes !== 'NoMRB_100';
    return reportModel;
}