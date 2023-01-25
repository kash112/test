import React, { useEffect, useState } from 'react';
import {
	Dialog, DialogContent, DialogTitle, Divider, Grid, Grow, IconButton, Paper, Typography,
} from '@material-ui/core';
import CheckIcon from '@material-ui/icons/Check';
import EditIcon from '@material-ui/icons/Edit';
import CloseIcon from '@material-ui/icons/Close';
import DeleteIcon from '@material-ui/icons/Delete';
import { Field, Form, Formik } from 'formik';
import { makeStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import * as yup from 'yup';
import { useRouter } from 'next/router';
import Layout from '../../layout';
import CustomLoader from '../Loader';
import TextField from '../formfield/textfield';
import Textarea from '../formfield/textarea';
import Button from '../formfield/button';
import Checkbox from '../formfield/checkbox';
import CustomChips from '../formfield/chips';
import formikSelect from '../formik/FormikSelect';
import CustomDatePicker from '../pickers/DatePicker';
import RadioButton from '../formfield/radiobutton';
import api, { handleError } from '../../lib/api';
import { useSnackbar } from '../../lib/context';
import MultiSelectDropdown from '../formfield/MultiSelectDropdown';
import { formatDate, formatDateWithWeekday, isFuture } from '../../lib/util';
import { getDay } from 'date-fns';
import moment from 'moment-timezone';
import { requiredNotesValidationSchema } from '@/lib/schema';

import SessionForm from './SessionForm';
import TermForm from './TermForm';
import AddTermsForm from './AddTermsForm';


const useStyles = makeStyles({
	contentFlexEnd: {
		marginTop: '25px',
		display: 'flex',
		justifyContent: 'flex-end',
	},
	grid: {
		padding: '4px 8px!important',
	},
	root: {
		width: '100%!important',
		display: 'flex',
		outlined: 'none!important',
		borderRadius: '50px',
		'& > * + *': {
			marginTop: '2px',
		},
		'&:hover': {
			backgroundColor: 'red!important',
		},
		'&.MuiPaper-root': {
			overflowY: 'auto',
		},
	},
	dialogContent: {
		maxWidth: '320px!important',
	},
	dialogTitle: {
		padding: '8px 24px',
	},
	displayFlex: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	divider: {
		marginBottom: '18px',
	},

	icons: {
		display: 'flex',
	},
	table: {
		width: '100%',
		borderRadius: '5px',
		overflow: 'hidden',
		borderCollapse: 'collapse',
		fontFamily: 'Cabin',
		marginTop: '1rem',
	},
	th: {
		textAlign: 'left',
		borderBottom: '1px solid #b7b7b7',
		backgroundColor: '#564395',
		color: 'white',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		padding: '0.5em 1em',
		'&:hover': {
			cursor: 'pointer',
		},
	},
	td: {
		textAlign: 'left',
		borderBottom: '1px solid #bdc2db',
		height: '30px',
		padding: '0.5em 2em',
	},
	tr: {
		backgroundColor: 'white',
		'&:hover': {
			backgroundColor: 'aliceblue',
		},
	},
});
const scheduleValidationSchema = yup.object()
	.shape({
		schedule: yup.object()
			.shape({
				capacity: yup
					.number()
					.typeError('Schedule capacity must be a number')
					.required('Schedule capacity is required'),
				type: yup.string()
					.required('Until is required'),
			}),
	});
const termValidationSchema = yup.object()
	.shape({
		term: yup.object()
			.shape({
				name: yup.string()
					.required('Term name is required'),
				capacity: yup
					.number()
					.typeError('Term capacity must be a number')
					.integer('Term Capacity must be an integer')
					.required('Term capacity is required'),
				price: yup
					.number()
					.typeError('Term price must be a number')
					.required('Term price is required'),
			}),
	});

function ClassesForm(props) {
	const {
		setFieldValue,
		values,
		errors,
		touched,
		classesData,
		setClassesData,
		handleResources,
		handleNotesSubmit,
		rest,
		resourcesValidationSchema,
		isEditPage,
	} = props;
	const classes = useStyles();
	const router = useRouter();
	const { openSnackbar } = useSnackbar();
	const [dialogOpen, setDialogOpen] = useState({
		state: false,
		type: 'Add',
		initialValues: '',
		title: '',
	});
	const isLargeMobile = useMediaQuery('(max-width:425px)');
	const isMediumMobile = useMediaQuery('(max-width:375px)');
	const isSmallMobile = useMediaQuery('(max-width:320px)');
	const isLaptop = useMediaQuery('(max-width:1024px)');
	const [isHover, setIsHover] = useState({});
	const [interestDialogOpen, setInterestDialogOpen] = useState(false);
	const [showAddDiscountButton, setShowAddDiscountButton] = useState(true);
	const [disableDiscountButton, setDisableDiscountButton] = useState(false);
	const [updatedDiscountId, setUpdatedDiscountId] = useState('');

	const [locations, setLocations] = useState();
	const [interests, setInterests] = useState();
	const [staff, setStaff] = useState();
	const [languages, setLanguages] = useState();
	const [loaded, setLoaded] = useState(false);

	const scheduleUntilData = [{
		text: 'Specific',
		value: 'specific',
	}, {
		text: 'Once',
		value: 'once',
	}];
	const ageType = [{
		text: 'Years',
		value: 'years',
	}, {
		text: 'Months',
		value: 'months',
	}];
	const weekday = [{
		text: 'Sunday',
		value: 0,
	}, {
		text: 'Monday',
		value: 1,
	}, {
		text: 'Tuesday',
		value: 2,
	}, {
		text: 'Wednesday',
		value: 3,
	}, {
		text: 'Thursday',
		value: 4,
	}, {
		text: 'Friday',
		value: 5,
	}, {
		text: 'Saturday',
		value: 6,
	}];
	const sessionBasedData = [{
		id: 1,
		text: 'Session-Based',
		value: 'session',
	}];
	const termBasedData = [{
		id: 1,
		text: 'Term-Based',
		value: 'term',
	}];
	const freeTrialData = [{
		id: 1,
		text: 'Free Trial',
		value: 'free',
	}];
	const paidTrialData = [{
		id: 1,
		text: 'Paid Trial',
		value: 'paid',
	}];

	const fetchData = async () => {
		try {
			const [{ data: locationData }, { data: interestData }, { data: staffData }, { data: languageData }] = await Promise.all([api.get('/provider/me/locations/'), api.get('/interests/'), api.get('/provider/me/staff/'), api.get('/languages/')]);
			setLocations([...locationData]);
			setInterests(interestData);
			setStaff(staffData);
			setLanguages(languageData);
			setLoaded(true);
		} catch (error) {
			handleError(error, router, openSnackbar);
		}
	};
	useEffect(() => {
		fetchData();
	}, []);

	function handleDialogClose() {
		setDialogOpen({
			...dialogOpen,
			state: false,
		});
	}

	values.schedules.sort((b, a) => {
		if (b.day > a.day) {
			return 1;
		}
		if (b.day < a.day) {
			return -1;
		}
		return 0;
	});

	const filterByWeekday = (date, filterdate) => {
		const day = getDay(date);
		return day == filterdate;
	};
	const handleMouseEnter = index => {
		setIsHover({ [index]: true });
	};
	const handleMouseLeave = index => {
		setIsHover({ [index]: false });
	};
	const handleScheduleAdd = () => {
		const scheduleValues = [...values.schedules];
		scheduleValues.push({
			capacity: '',
			dayOfWeek: new Date().getDay(),
			date: new Date(),
			startTime: scheduleValues.length > 0 ? scheduleValues[scheduleValues.length - 1].startTime : '',
			endTime: scheduleValues.length > 0 ? scheduleValues[scheduleValues.length - 1].endTime : '',
			isAdded: true,
			endDay: new Date(),
			type: 'once',
		});
		setFieldValue('schedules', scheduleValues);
	};
	const handleScheduleRemove = index => {
		const scheduleValues = [...values.schedules];
		scheduleValues.splice(index, 1);
		setFieldValue('schedules', scheduleValues);
	};

	async function handleScheduleSubmit(val) {
		try {
			if (val.schedule.day.getDay() != val.schedule.dayOfWeek) {
				openSnackbar('error', 'Date selected and the weekday should have same day of week.');
			} else {
				const { data } = await api.post(`/provider/me/classes/${values.id}/schedules/`, {
					...val,
					schedule: {
						...val.schedule,
						startTime: val.schedule.startTime,
						endTime: val.schedule.endTime,
					},
				});
				handleDialogClose();
				setClassesData(data);
				openSnackbar('success', 'Schedule added');
				router.reload();
			}
		} catch (error) {
			console.error(error);
			handleError(error, router, openSnackbar);
		}
	}

	function getAllSchedulesByTerm(schedules) {
		return schedules.map(s => {
			if (s.dayOfWeek != s.day.getDay()) {
				openSnackbar('error', 'Term session date selected and the weekday should have same day of week.');
				return false;
			}
			return {
				...s,
				startTime: s.startTime,
				endTime: s.endTime,
			};
		});
	}

	const handleViewStudents = id => {
		router.push(`/attendance/${id}`);
	};

	async function handleTermSubmit(val) {
		try {
			const allSchedulesByTerm = getAllSchedulesByTerm(val.term.schedules);
			if (allSchedulesByTerm) {
				const { data } = await api.post(`/provider/me/classes/${values.id}/terms/`, {
					...val,
					term: {
						...val.term,
						schedules: allSchedulesByTerm,
					},
				});
				handleDialogClose();
				setClassesData(data);
				openSnackbar('success', 'Term added');
				router.reload();
			}
		} catch (error) {
			console.error(error);
			handleError(error, router, openSnackbar);
		}
	}

	const handlePastSessions = async () => {
		router.push(`/classes/past-sessions/${router.query.id}`);
	};

	function openInterestDialog() {
		setInterestDialogOpen(true);
	}

	function closeInterestDialog() {
		setInterestDialogOpen(false);
	}

	const handleAddNotes = () => {
		if (!values.notes) {
			openSnackbar('error', 'Class Note cannot be blank.');
		} else {
			setFieldValue('notes', [{ note: values.note }, ...values.notes]);
			setFieldValue('notes', '');
		}
	};

	async function handleAddDiscount() {
		setShowAddDiscountButton(false);
		setUpdatedDiscountId('');
		setDisableDiscountButton(true);
		const discountValues = [...values.discounts];
		discountValues.push({
			code: '',
			percent: '',
		});
		setFieldValue('discounts', discountValues);
	}

	const discountSchema = yup.object()
		.shape({
			code: yup.string()
				.required('Discount code is required.'),
			percent: yup
				.number()
				.positive('Discount must be greater than 0')
				.typeError('Discount must be a number')
				.required('Discount is required'),
		});

	async function handleValidateDiscount(item) {
		try {
			await discountSchema.validate(item);
			setShowAddDiscountButton(true);
			setUpdatedDiscountId('');
			setDisableDiscountButton(false);
		} catch (e) {
			console.error(e);
			openSnackbar('error', e.errors[0]);
		}
	}

	async function handleRemoveDiscount(item) {
		const discountValues = [...values.discounts];
		discountValues.splice(item, 1);
		setFieldValue('discounts', discountValues);
		setShowAddDiscountButton(true);
		setDisableDiscountButton(false);
	}

	async function handleUpdateDiscount(id) {
		setUpdatedDiscountId(id);
		setDisableDiscountButton(true);
	}

	async function handleCloseDiscount(item) {
		setShowAddDiscountButton(true);
		setFieldValue('discounts', item);
		setUpdatedDiscountId('');
		setDisableDiscountButton(false);
	}

	async function handleUpdateAllDiscounts() {
		try {
			const { data } = await api.post(`/provider/class/${values.id}/discounts/`, {
				discounts: values.discounts,
			});
			handleDialogClose();
			setFieldValue('discounts', data.discounts);
			openSnackbar('success', data.message);
			// router.reload();
		} catch (error) {
			console.error(error);
			handleError(error, router, openSnackbar);
		}
	}

	if (!loaded) {
		return (
			<Layout>
				<CustomLoader />
			</Layout>
		);
	}

	return (
		<div>
			<Dialog
				open={interestDialogOpen}
				onClose={closeInterestDialog}
				TransitionComponent={Grow}
			>
				<DialogTitle className={classes.dialogTitle}>
					<div className={classes.displayFlex}>
						<Typography className="display-medium-title">
							Available Tags
						</Typography>
						<img
							src="/images/cancel.svg"
							alt="Cancel"
							style={{
								margin: '0 1px',
								height: '20px',
							}}
							onClick={closeInterestDialog}
						/>
					</div>
				</DialogTitle>
				<DialogContent className={classes.dialogContent}>
					<Divider className={classes.divider} />
					<Grid container spacing={1}>
						{interests.map((interest, infoIndex) => (
							<Grid item xs={6} key={interest.id}>
								<Typography className="body-subduced">
									{interest.name}
								</Typography>
							</Grid>
						))}
					</Grid>
				</DialogContent>
			</Dialog>
			<Dialog
				open={dialogOpen.state}
				onClose={handleDialogClose}
				TransitionComponent={Grow}
				classes={{ paper: classes.root }}
			>
				<DialogTitle>
					<div className={classes.displayFlex}>
						<Typography className="display-medium-title">
							{dialogOpen.title}
						</Typography>
						<IconButton onClick={handleDialogClose}>
							<CloseIcon />
						</IconButton>
					</div>
					<Divider style={{ margin: '0.2em 0' }} />
				</DialogTitle>
				<DialogContent
					style={dialogOpen.type === 'Session' ? { width: '320px' } : { width: '600px' }}
				>
					{dialogOpen.type === 'Session' ? (
						<Formik
							validationSchema={scheduleValidationSchema}
							initialValues={dialogOpen.initialValues}
							onSubmit={handleScheduleSubmit}
						>
							{({
								  values,
								  setFieldValue,
								  errors,
								  touched,
							  }) => (
								<SessionForm
									setFieldValue={setFieldValue}
									values={values}
									errors={errors}
									touched={touched}
								/>
							)}
						</Formik>
					) : (
						<Formik
							validationSchema={termValidationSchema}
							initialValues={dialogOpen.initialValues}
							onSubmit={handleTermSubmit}
						>
							{({
								  values,
								  setFieldValue,
								  errors,
								  touched,
							  }) => (
								<TermForm
									setFieldValue={setFieldValue}
									values={values}
									terms={classesData.terms}
									errors={errors}
									touched={touched}
								/>
							)}
						</Formik>
					)}
				</DialogContent>
			</Dialog>
			<Paper className="card">
				<Form>
					<Typography
						className="display-small-normal"
						style={{ marginBottom: '1em' }}
					>
						About
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} className={classes.grid}>
							<Field
								as={TextField}
								setFieldValue={setFieldValue}
								name="name"
								label="Class Name"
							/>
						</Grid>
						<Grid item xs={12} sm={6} className={classes.grid}>
							<Field
								as={TextField}
								setFieldValue={setFieldValue}
								name="chineseName"
								label="Class Name (Chinese) "
							/>
						</Grid>
						<Grid item xs={12} className={classes.grid}>
							<Field
								as={Textarea}
								setFieldValue={setFieldValue}
								name="description"
								label="Description"
								rows={2}
								collapseWhitespace={false}
							/>
						</Grid>
						<Grid item xs={12} className={classes.grid}>
							<Field
								as={Textarea}
								setFieldValue={setFieldValue}
								name="chineseDescription"
								rows={2}
								label="Description (Chinese)"
								collapseWhitespace={false}
							/>
						</Grid>
						<Grid
							item
							xs={12}
							className={classes.grid}
							style={{
								display: 'flex',
								justifyContent: 'flex-end',
								alignItems: 'flex-end',
							}}
						>
							<Typography
								className="body-subduced"
								style={{
									cursor: 'pointer',
									marginBottom: '-15px',
								}}
								onClick={openInterestDialog}
							>
								Available Tags
							</Typography>
						</Grid>
						<Grid item xs={12} className={classes.grid}>
							{/* <Field */}
							{/* 	as={CustomChips} */}
							{/* 	name="interests" */}
							{/* 	value={values.interests} */}
							{/* 	labelField="name" */}
							{/* 	setFieldValue={setFieldValue} */}
							{/* 	label="Tags" */}
							{/* 	handleAdd={interest => { */}
							{/* 		if (interest.actual_id) { */}
							{/* 			const interests = [...values.interests]; */}
							{/* 			const interestIds = [...values.interestIds]; */}
							{/* 			interests.push(interest); */}
							{/* 			interestIds.push(interest.id); */}
							{/* 			setFieldValue('interestIds', interestIds); */}
							{/* 			setFieldValue('interests', interests); */}
							{/* 		} else { */}
							{/* 			const matchingInterests = interests.filter(interestOption => interestOption.name.toLowerCase() */}
							{/* 				.startsWith(interest.name.toLowerCase())); */}
							{/* 			if (matchingInterests.length === 1) { */}
							{/* 				const interests = [...values.interests]; */}
							{/* 				const interestIds = [...values.interestIds]; */}
							{/* 				interests.push({ */}
							{/* 					...matchingInterests[0], */}
							{/* 					actualId: matchingInterests[0].id, */}
							{/* 					id: matchingInterests[0].id.toString(), */}
							{/* 				}); */}
							{/* 				interestIds.push(matchingInterests[0].id); */}
							{/* 				setFieldValue('interestIds', interestIds); */}
							{/* 				setFieldValue('interests', interests); */}
							{/* 			} */}
							{/* 		} */}
							{/* 	}} */}
							{/* 	handleRemove={i => { */}
							{/* 		setFieldValue('interests', values.interests.filter((interest, index) => index !== i)); */}
							{/* 		const interestId = [...values.interestIds]; */}
							{/* 		interestId.splice(i, 1); */}
							{/* 		setFieldValue('interestIds', interestId); */}
							{/* 	}} */}
							{/* 	suggestions={interests} */}
							{/* /> */}
						</Grid>
						<Grid item xs={12} className={classes.grid}>
							<Typography className="subheading-normal">
								Age
							</Typography>
						</Grid>
						<Grid
							item
							xs={12}
							sm={4}
							md={3}
							className={classes.grid}
						>
							<Field
								as={TextField}
								setFieldValue={setFieldValue}
								name="fromAge"
								label="From"
							/>
						</Grid>
						<Grid
							item
							xs={12}
							sm={4}
							md={3}
							className={classes.grid}
						>
							<Field
								as={TextField}
								setFieldValue={setFieldValue}
								name="toAge"
								label="To"
							/>
						</Grid>
						<Grid
							item
							xs={12}
							sm={4}
							md={3}
							className={classes.grid}
						>
							<Field
								component={formikSelect}
								fullWidth
								name="ageType"
								label="Age Type"
								textField="text"
								placeholder="Please select"
								valueField="value"
								options={ageType}
							/>
						</Grid>
					</Grid>
					<Grid container spacing={2}>
						<Grid
							item
							xs={12}
							sm={4}
							className={classes.grid}
							style={{ margin: '0 0 0.4em 0' }}
						>
							<Field
								component={MultiSelectDropdown}
								fullWidth
								name="languageIds"
								label="Languages"
								labelField="name"
								value={values.languageIds}
								placeholder="Select languages"
								valueField="id"
								multi
								color="#233b76"
								backspaceDelete
								contentRenderer={() => (
									<div>
										<Typography className="body-standard">
											{values.languageIds.length}
											{values.languageIds.length === 1 ? ' language selected' : ' languages selected'}
										</Typography>
									</div>
								)}
								searchable
								searchBy="name"
								options={languages}
								onChange={val => {
									const languageId = [];
									val.map(v => languageId.push(v.id));
									setFieldValue('languageIds', languageId);
								}}
							/>
						</Grid>
					</Grid>
					<Grid container style={{ marginTop: '1em' }}>
						<Grid item xs={12} className={classes.grid}>
							<Typography className="subheading-normal">
								Pricing
							</Typography>
						</Grid>
					</Grid>
					<Grid container spacing={2}>
						<Grid
							item
							xs={12}
							className={classes.grid}
							style={{ margin: '0.5em 0' }}
						>
							<Field
								component={RadioButton}
								textField="text"
								valueField="value"
								setFieldValue={setFieldValue}
								style={{ margin: '4px 0px 0px 0px' }}
								options={sessionBasedData}
								name="classType"
								readOnly={(isEditPage && values.classType == 'term') || (!isEditPage && values.terms.length > 0)}
								onChange={v => setFieldValue('classType', v.target.value)}
							/>
						</Grid>
					</Grid>
					{values.classType !== 'session' ? (
						<Grid container spacing={2}>
							<Grid item xs={12} className={classes.grid}>
								<Typography className="body-subduced">
									This allows you to offer parents the option
									of purchasing individual sessions or groups
									of sessions. This is useful for one-on-one
									classes or for offering volume discounts.
								</Typography>
							</Grid>
						</Grid>
					) : (
						<>
							<Grid container spacing={2}>
								<Grid
									item
									xs={12}
									sm={4}
									lg={3}
									style={{
										padding: '0px 8px',
										margin: '0.5em 0 -0.5em 2.2em',
									}}
								>
									<Field
										as={Checkbox}
										label="Enable Single Sessions"
										name="allowSingleSession"
										setFieldValue={setFieldValue}
										className="container"
										style={{
											height: '1rem',
											width: '1rem',
											marginRight: '10px',
										}}
									/>
									<br />
									{values.allowSingleSession && (
										<Field
											as={TextField}
											setFieldValue={setFieldValue}
											name="singleSessionPrice"
											label="Single Session Price"
											placeholder="Single Session Price"
											isPrice
										/>
									)}
								</Grid>
								<Grid
									item
									xs={12}
									style={{
										marginLeft: '2.2em',
										marginBottom: '0.4em',
									}}
								>
									<Field
										as={Checkbox}
										label="Enable Class Pack"
										name="allowClassPack"
										setFieldValue={setFieldValue}
										className="container"
										style={{
											height: '1rem',
											width: '1rem',
											marginRight: '10px',
										}}
									/>
								</Grid>
								{values.allowClassPack && (
									<Grid container>
										<Grid
											item
											xs={12}
											sm={4}
											lg={3}
											className={classes.grid}
											style={{ margin: '0.6em 0 0 1.8em' }}
										>
											<Field
												as={TextField}
												setFieldValue={setFieldValue}
												name="classPackQuantity"
												label="Class Pack Quantity"
												placeholder="Class Pack Quantity"
											/>
										</Grid>
										<Grid
											item
											xs={12}
											sm={4}
											lg={3}
											className={classes.grid}
											style={{ margin: '0.6em 0 0 0' }}
										>
											<Field
												as={TextField}
												setFieldValue={setFieldValue}
												name="classPackPrice"
												label="Class Pack Price"
												placeholder="Class Pack Price"
												isPrice
											/>
										</Grid>
									</Grid>
								)}
							</Grid>
							{!isEditPage && values.schedules.map((field, id) => (
								<Grid key={field.id} container style={{ padding: '0 0 0 1.8em' }}>
									<Grid item xs={12} sm={3} md={4} lg className={classes.grid}>
										<Field
											component={formikSelect}
											fullWidth
											name={`schedules[${id}].dayOfWeek`}
											label="Weekday"
											textField="text"
											placeholder="Select Weekday"
											valueField="value"
											options={weekday}
										/>
									</Grid>
									<Grid item xs={12} sm={5} md={4} lg={2} className={classes.grid}>
										<Field
											component={CustomDatePicker}
											name={`schedules[${id}].date`}
											setFieldValue={setFieldValue}
											label="Start Day"
											value={field.date}
											dateFormat="MMMM d, yyyy"
											useWeekdaysShort
											minDate={new Date()}
											filterDate={date => filterByWeekday(date, field.dayOfWeek)}
											showDisabledMonthNavigation
										/>
									</Grid>
									<Grid item xs={12} sm={2} md lg className={classes.grid}>
										<Field
											component={CustomDatePicker}
											name={`schedules[${id}].startTime`}
											setFieldValue={setFieldValue}
											label="Start Time"
											value={field.startTime}
											error={touched.schedules && errors.schedules && errors.schedules[id]?.startTime}
											showTimeSelect
											onChange={e => setFieldValue(`schedules[${id}].startTime`, e)}
											showTimeSelectOnly
											timeIntervals={15}
											timeCaption="Time"
											dateFormat="h:mmaa"
										/>
									</Grid>
									<Grid item xs={12} sm={2} md lg className={classes.grid}>
										<Field
											component={CustomDatePicker}
											name={`schedules[${id}].endTime`}
											setFieldValue={setFieldValue}
											label="End Time"
											value={field.endTime}
											error={touched.schedules && errors.schedules && errors.schedules[id]?.endTime}
											showTimeSelect
											showTimeSelectOnly
											timeIntervals={15}
											timeCaption="Time"
											dateFormat="h:mmaa"
											minTime={moment(field.startTime)
												.add(15, 'm')
												.toDate()}
											maxTime={moment(field.startTime)
												.add(1, 'd')
												.toDate()}
										/>
									</Grid>
									<Grid item xs={12} sm={3} md={3} lg className={classes.grid}>
										<Field
											as={TextField}
											setFieldValue={setFieldValue}
											name={`schedules[${id}].capacity`}
											label="Capacity"
											value={field.capacity}
										/>
									</Grid>
									<Grid item xs={12} sm={3} md={3} lg className={classes.grid}>
										<Field
											component={formikSelect}
											fullWidth
											name={`schedules[${id}].type`}
											label="Until"
											textField="text"
											placeholder="Select Until"
											valueField="value"
											options={scheduleUntilData}
										/>
									</Grid>
									{field.type === 'specific' && (
										<Grid item xs={12} sm={4} md={4} lg={2} className={classes.grid}>
											<Field
												component={CustomDatePicker}
												name={`schedules[${id}].endDay`}
												setFieldValue={setFieldValue}
												label="End Day"
												value={field.endDay}
												error={touched.schedules && touched.schedules[id]?.endDay && errors.schedules && errors.schedules[id]?.endDay}
												placeholderText="Enter End Day"
												dateFormat="MMMM d, yyyy"
												useWeekdaysShort
												minDate={field.day}
												filterDate={date => filterByWeekday(date, field.dayOfWeek)}
												showDisabledMonthNavigation
											/>
										</Grid>
									)}
									{field.isAdded && (
										<Grid
											item
											xs={12}
											sm={2}
											md={2}
											lg
											className={classes.grid}
											style={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'flex-start',
												maxHeight: '6.5em',
											}}
										>
											<Button
												color="primary"
												onClick={() => handleScheduleRemove(id)}
											>
												Cancel
											</Button>
										</Grid>
									)}
								</Grid>
							))}
							{!isEditPage && (
								<Grid container spacing={2}>
									<Grid item xs={12} className={classes.grid}>
										<Button
											color="primary"
											onClick={handleScheduleAdd}
											style={{ margin: '0.5em 0 0 2.2em' }}
										>
											{values.schedules.length === 0 ? 'Add Schedule' : 'Add Another Schedule'}
										</Button>
									</Grid>
								</Grid>
							)}
							{!isEditPage && errors.schedules && typeof errors.schedules === 'string' && touched.schedules && (
								<div style={{ marginTop: '1em' }}>
									<Typography className="body-standard errorText">
										{errors.schedules}
									</Typography>
								</div>
							)}
						</>
					)}
					<Grid container spacing={2}>
						<Grid
							item
							xs={12}
							className={classes.grid}
							style={{ margin: '0.5em 0' }}
						>
							<Field
								component={RadioButton}
								textField="text"
								valueField="value"
								setFieldValue={setFieldValue}
								style={{ margin: '4px 0px' }}
								options={termBasedData}
								name="classType"
								readOnly={(isEditPage && values.classType === 'session') || (!isEditPage && values.schedules.length > 0)}
								onChange={v => setFieldValue('classType', v.target.value)}
							/>
						</Grid>
					</Grid>
					{values.classType !== 'term' ? (
						<Grid container spacing={2}>
							<Grid item xs={12} className={classes.grid}>
								<Typography className="body-subduced">
									Terms allow you to group sessions by date.
									This is useful for activities like team
									sports, which are always available but have
									distinct seasons.
								</Typography>
							</Grid>
						</Grid>
					) : (
						<>
							{!isEditPage && (
								<AddTermsForm
									terms={values.terms}
									setFieldValue={setFieldValue}
									errors={errors}
									touched={touched}
								/>
							)}
							<Grid container spacing={2}>
								<Grid
									item
									xs={12}
									className={classes.grid}
									style={{ margin: '0.4em 0 0 1.8em' }}
								>
									<Field
										as={Checkbox}
										label="Allow Mid-Term Booking"
										disabled={values.classType === 'term' && values.allowTrial}
										name="allowMidtermBooking"
										setFieldValue={setFieldValue}
										className="container"
										style={{
											height: '1rem',
											width: '1rem',
											marginRight: '10px',
										}}
									/>
								</Grid>
							</Grid>
						</>
					)}
					<Grid container spacing={2}>
						<Grid
							item
							xs={12}
							className={classes.grid}
							style={{ marginTop: '0.6em' }}
						>
							<Typography className="subheading-normal">
								Options
							</Typography>
						</Grid>

						<Grid
							item
							xs={12}
							className={classes.grid}
							style={{ margin: '0.4em 0 0 0' }}
						>
							<Field
								as={Checkbox}
								label="List this class publicly"
								name="public"
								setFieldValue={setFieldValue}
								className="container"
								style={{
									height: '1rem',
									width: '1rem',
									marginRight: '10px',
								}}
							/>
						</Grid>

						<Grid
							item
							xs={12}
							className={classes.grid}
						>
							{/*  && !values.allowMidtermBooking */}
							<Field
								as={Checkbox}
								disabled={values.classType === 'term'}
								label="Allow Trial Class"
								name="allowTrial"
								setFieldValue={setFieldValue}
								className="container"
								style={{
									height: '1rem',
									width: '1rem',
									marginRight: '10px',
								}}
							/>
						</Grid>
					</Grid>
					{values.allowTrial && (
						<>
							<Grid
								container
								style={{ margin: '0.4em 0 0 1.8em' }}
							>
								<Grid item xs={12} className={classes.grid}>
									<Field
										component={RadioButton}
										textField="text"
										valueField="value"
										setFieldValue={setFieldValue}
										style={{ margin: '4px 0px' }}
										options={freeTrialData}
										name="trialType"
										readOnly={values.classType === 'term' && !values.allowMidtermBooking}
										onChange={v => setFieldValue('trialType', v.target.value)}
									/>
								</Grid>
								<Grid item xs={12} className={classes.grid}>
									<Field
										component={RadioButton}
										textField="text"
										valueField="value"
										setFieldValue={setFieldValue}
										style={{ margin: '4px 0px' }}
										options={paidTrialData}
										name="trialType"
										readOnly={values.classType === 'term' && !values.allowMidtermBooking}
										onChange={v => setFieldValue('trialType', v.target.value)}
									/>
								</Grid>
							</Grid>
							{values.trialType === 'paid' && (
								<Grid
									container
									spacing={2}
									style={{ margin: '0.4em 0 0 1.8em' }}
								>
									<Grid
										item
										xs={12}
										sm={3}
										className={classes.grid}
									>
										<Field
											as={TextField}
											setFieldValue={setFieldValue}
											name="trialPrice"
											label="Trial Class Price"
											placeholder="Trial Class Price"
											isPrice
										/>
									</Grid>
								</Grid>
							)}
						</>
					)}
					{/* <Grid container spacing={2} style={{ marginTop: '0.4em' }}> */}
					{/* 	<Grid item xs={12} className={classes.grid}> */}
					{/* 		<Field */}
					{/* 			as={Checkbox} */}
					{/* 			label="Allow Waitlist" */}
					{/* 			name="allowWaitlist" */}
					{/* 			setFieldValue={setFieldValue} */}
					{/* 			className="container" */}
					{/* 			style={{ */}
					{/* 				height: '1rem', */}
					{/* 				width: '1rem', */}
					{/* 				marginRight: '10px', */}
					{/* 			}} */}
					{/* 		/> */}
					{/* 	</Grid> */}
					{/* </Grid> */}
					<Grid container spacing={2} style={{ marginTop: '1em' }}>
						{!isEditPage && (
							<>
								<Grid item xs={12}>
									<Typography className="subheading-normal">
										Resources
									</Typography>
								</Grid>
								<Grid
									item
									xs={12}
									sm={4}
									className={classes.grid}
									style={{ margin: '0 0 0.4em 0' }}
								>
									<Field
										component={MultiSelectDropdown}
										fullWidth
										name="staffIds"
										label="Staff"
										labelField="firstName"
										value={values.staffIds}
										placeholder="Select Staff"
										valueField="id"
										multi
										color="#233b76"
										backspaceDelete
										contentRenderer={() => (
											<div>
												<Typography className="body-standard">
													{values.staffIds.length}
													{' Staff Selected '}
												</Typography>
											</div>
										)}
										searchable
										searchBy="firstName"
										options={staff}
										onChange={val => {
											const staffId = [];
											val.map(v => staffId.push(v.id));
											setFieldValue('staffIds', staffId);
										}}
									/>
								</Grid>
								<Grid
									item
									xs={12}
									sm={4}
									className={classes.grid}
								>
									<Field
										component={formikSelect}
										fullWidth
										name="locationId"
										label="Location"
										textField="name"
										placeholder="Select Location"
										valueField="id"
										options={locations}
									/>
								</Grid>
								<Grid
									item
									xs={12}
									sm={4}
									className={classes.grid}
								>
									<Field
										component={formikSelect}
										fullWidth
										name="roomId"
										label="Room"
										textField="name"
										placeholder={values.locationId && values.locationId >= 0 ? 'Select room' : 'N/A'}
										valueField="id"
										options={values.locationId && values.locationId >= 0 ? locations.filter(loc => loc.id == values.locationId)[0].rooms : []}
									/>
								</Grid>

								<Grid item xs={9} className={classes.grid}>
									<Field
										as={Textarea}
										setFieldValue={setFieldValue}
										label="Class notes"
										name="note"
										placeholder="Add a note"
									/>
								</Grid>
								{isEditPage && (
									<Grid
										item
										xs={3}
										className={classes.grid}
										style={{ alignSelf: 'center' }}
									>
										<Button onClick={handleAddNotes}>
											Add Notes
										</Button>
									</Grid>
								)}
								<Grid
									item
									xs={12}
									style={{ paddingLeft: '5px' }}
								>
									{values.notes.map(item => (
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												backgroundColor: '#233b76',
												margin: '2px 0',
												borderRadius: '6px',
												width: 'fit-content',
												padding: '3px 8px',
											}}
											onMouseEnter={() => handleMouseEnter(item.id)}
											onMouseLeave={() => handleMouseLeave(item.id)}
										>
											{' '}
											<Typography
												style={{
													margin: '1px 40px 1px 0',
													color: 'white',
													fontFamily: 'Cabin',
													fontSize: '13px',
												}}
											>
												{item.note}
											</Typography>
											<Typography
												style={{
													cursor: 'pointer',
													color: 'white',
													fontSize: '15px',
												}}
												onClick={() => setFieldValue('notes', values.notes.filter(i => i.note != item.note))}
											>
												x
											</Typography>
										</div>
									))}
								</Grid>

								{/* <Grid item xs={12}> */}
								{/* 	<Typography */}
								{/* 		className="display-small-normal" */}
								{/* 		style={{ marginBottom: '1em' }} */}
								{/* 	> */}
								{/* 		Discounts */}
								{/* 	</Typography> */}
								{/* </Grid> */}
								{/* {showAddDiscountButton && ( */}
								{/* 	<Grid container spacing={2}> */}
								{/* 		<Grid item xs={12} sm={12}> */}
								{/* 			<Button */}
								{/* 				style={{ marginBottom: '20px' }} */}
								{/* 				color="primary" */}
								{/* 				onClick={handleAddDiscount} */}
								{/* 			> */}
								{/* 				Add discount */}
								{/* 			</Button> */}
								{/* 		</Grid> */}
								{/* 	</Grid> */}
								{/* )} */}
								{/* <Grid item xs={12}> */}
								{/* 	{values.discounts?.length > 0 && ( */}
								{/* 		<table className={classes.table}> */}
								{/* 			<thead> */}
								{/* 			<tr> */}
								{/* 				<th className={classes.th}>Discount Code</th> */}
								{/* 				<th className={classes.th}>Discount %</th> */}
								{/* 				<th className={classes.th}>Action</th> */}
								{/* 			</tr> */}
								{/* 			</thead> */}
								{/* 			<tbody> */}
								{/* 			{values.discounts.map((field, id) => ( */}
								{/* 				<tr className={classes.tr} key={field.id}> */}
								{/* 					<td className={classes.td} style={{ width: '50%' }}> */}
								{/* 						{ */}
								{/* 							id === updatedDiscountId || (!showAddDiscountButton && values.discounts.length - 1 == id) ? ( */}
								{/* 								<Field */}
								{/* 									as={TextField} */}
								{/* 									setFieldValue={(fieldName, value) => setFieldValue(fieldName, value.toUpperCase())} */}
								{/* 									name={`discounts[${id}].code`} */}
								{/* 									value={field.code} */}
								{/* 									placeholder="Enter discount code (e.g. SAVE10)." */}
								{/* 								/> */}
								{/* 							) : ( */}
								{/* 								field.code */}
								{/* 							) */}
								{/* 						} */}
								{/* 					</td> */}
								{/* 					<td className={classes.td} style={{ width: '35%' }}> */}
								{/* 						{ */}
								{/* 							id === updatedDiscountId || (!showAddDiscountButton && values.discounts.length - 1 == id) ? ( */}
								{/* 								<Field */}
								{/* 									as={TextField} */}
								{/* 									setFieldValue={setFieldValue} */}
								{/* 									value={field.percent} */}
								{/* 									name={`discounts[${id}].percent`} */}
								{/* 									placeholder="Enter discount %." */}
								{/* 								/> */}
								{/* 							) : ( */}
								{/* 								field.percent */}
								{/* 							) */}
								{/* 						} */}
								{/* 					</td> */}
								{/* 					<td */}
								{/* 						className={classes.td} */}
								{/* 						style={{ width: '15%' }} */}
								{/* 					> */}
								{/* 						{ */}
								{/* 							!showAddDiscountButton && id === values.discounts.length - 1 && updatedDiscountId === '' ? ( */}
								{/* 								<Grid */}
								{/* 									item */}
								{/* 									xs={12} */}
								{/* 									sm={2} */}
								{/* 									lg={1} */}
								{/* 									className={classes.icons} */}
								{/* 								> */}
								{/* 									<IconButton */}
								{/* 										onClick={() => handleValidateDiscount(field)} */}
								{/* 									> */}
								{/* 										<CheckIcon /> */}
								{/* 									</IconButton> */}
								{/* 									<IconButton */}
								{/* 										onClick={() => handleRemoveDiscount(id)} */}
								{/* 									> */}
								{/* 										<CloseIcon /> */}
								{/* 									</IconButton> */}
								{/* 								</Grid> */}
								{/* 							) : id === updatedDiscountId ? ( */}
								{/* 								<Grid */}
								{/* 									item */}
								{/* 									xs={12} */}
								{/* 									sm={2} */}
								{/* 									lg={1} */}
								{/* 									className={classes.icons} */}
								{/* 								> */}
								{/* 									<IconButton */}
								{/* 										onClick={() => handleValidateDiscount(field)} */}
								{/* 									> */}
								{/* 										<CheckIcon /> */}
								{/* 									</IconButton> */}
								{/* 									<IconButton onClick={() => handleCloseDiscount(id)}> */}
								{/* 										<CloseIcon /> */}
								{/* 									</IconButton> */}
								{/* 								</Grid> */}
								{/* 							) : ( */}
								{/* 								<Grid */}
								{/* 									item */}
								{/* 									xs={12} */}
								{/* 									sm={2} */}
								{/* 									lg={1} */}
								{/* 									className={classes.icons} */}
								{/* 								> */}
								{/* 									<IconButton */}
								{/* 										onClick={() => updatedDiscountId == '' && showAddDiscountButton && handleUpdateDiscount(id)} */}
								{/* 									> */}
								{/* 										<EditIcon /> */}
								{/* 									</IconButton> */}
								{/* 									<IconButton */}
								{/* 										onClick={() => updatedDiscountId == '' && showAddDiscountButton && handleRemoveDiscount(id)} */}
								{/* 									> */}
								{/* 										<DeleteIcon /> */}
								{/* 									</IconButton> */}
								{/* 								</Grid> */}
								{/* 							) */}
								{/* 						} */}
								{/* 					</td> */}
								{/* 				</tr> */}
								{/* 			))} */}
								{/* 			</tbody> */}
								{/* 		</table> */}
								{/* 	)} */}
								{/* </Grid> */}
							</>
						)}
					</Grid>
					<div className={classes.contentFlexEnd}>
						<Button
							type="submit"
							variant="contained"
							disabled={rest.isSubmitting}
							color="primary"
						>
							Save
						</Button>
					</div>
				</Form>
			</Paper>
			{isEditPage && (
				<>
					<Paper className="card">
						<Grid
							container
							direction="row"
							justifyContent="space-between"
							alignItems="flex-end"
						>
							<Grid item xs={12}>
								<Typography
									className="display-small-normal"
									style={{ marginBottom: '1em' }}
								>
									Resources
								</Typography>
							</Grid>
						</Grid>
						<Formik
							validationSchema={resourcesValidationSchema}
							initialValues={values}
							onSubmit={handleResources}
						>
							{({
								  values,
								  setFieldValue,
								  errors,
								  touched,
								  ...p
							  }) => {
								useEffect(() => {
									if ((values.locationId && values.location && values.location.id != values.locationId) || (values.room && values.room.id != values.roomId)) {
										setFieldValue('roomId', '');
									}
								}, [values.locationId]);
								return (
									<Form>
										<Grid
											container
											spacing={1}
											direction="row"
											justifyContent="space-between"
											alignItems="flex-start"
										>
											<Grid item xs={12} sm={4}>
												<Field
													component={MultiSelectDropdown}
													fullWidth
													name="staffIds"
													label="Staff"
													labelField="firstName"
													values={values.staff}
													placeholder="Select staff"
													valueField="id"
													multi
													color="#233b76"
													contentRenderer={() => (
														<div>
															<Typography className="body-standard">
																{values.staffIds.length}
																{' '}
																Staff Selected
																{' '}
															</Typography>
														</div>
													)}
													searchable
													searchBy="firstName"
													options={staff}
													onChange={val => {
														const staffId = [];
														val.map(v => staffId.push(v.id));
														setFieldValue('staffIds', staffId);
													}}
												/>
											</Grid>
											<Grid item xs={12} sm={4}>
												<Field
													component={formikSelect}
													fullWidth
													name="locationId"
													label="Location"
													textField="name"
													value={values.locationId}
													placeholder="Select location"
													valueField="id"
													options={locations}
												/>
											</Grid>
											<Grid
												item
												xs={12}
												sm={4}
												className={classes.grid}
											>
												<Field
													component={formikSelect}
													fullWidth
													name="roomId"
													label="Room"
													textField="name"
													placeholder={values.locationId && values.locationId >= 0 ? 'Select room' : 'N/A'}
													valueField="id"
													options={values.locationId && values.locationId >= 0 ? locations.filter(loc => loc.id == values.locationId)[0].rooms : []}
												/>
											</Grid>
											<Grid
												item
												xs={12}
												className={classes.grid}
												style={{
													display: 'flex',
													justifyContent: 'flex-end',
													marginTop: '0.5em',
												}}
											>
												<Button
													variant="contained"
													type="submit"
													disabled={p.isSubmitting}
													color="primary"
												>
													Save
												</Button>
											</Grid>
										</Grid>
									</Form>
								);
							}}
						</Formik>
					</Paper>
					<Paper
						className="card"
						style={{
							overflowX: 'auto',
							width: isSmallMobile ? '240px' : isMediumMobile ? '295px' : isLargeMobile ? '345px' : '100%',
						}}
					>
						<Grid
							container
							direction="row"
							justifyContent="space-between"
							alignItems="flex-end"
							spacing={2}
							style={{ width: isLargeMobile ? '530px' : '100%' }}
						>
							<Grid item>
								<Typography
									className="display-small-normal"
									style={{ marginBottom: '1em' }}
								>
									Upcoming Sessions
								</Typography>
							</Grid>
							<Grid item>
								<Typography
									className="components-buttons-thin"
									onClick={handlePastSessions}
								>
									Show Past Sessions
								</Typography>
							</Grid>
						</Grid>
						{values.classType === 'session' && values.schedules.length > 0 && (
							<Grid
								container
								direction="row"
								justifyContent="space-between"
								spacing={2}
								alignItems="center"
								style={{
									width: isLargeMobile ? '550px' : '100%',
								}}
							>
								<Grid item xs={4}>
									<Typography className="body-emphasized">
										Date
									</Typography>
								</Grid>
								<Grid item xs>
									<Typography className="body-emphasized">
										Time
									</Typography>
								</Grid>
								<Grid item xs>
									<Typography className="body-emphasized">
										Capacity
									</Typography>
								</Grid>
								<Grid item xs>
									<Typography className="body-emphasized">
										Actions
									</Typography>
								</Grid>
							</Grid>
						)}
						{values.classType === 'session' ? values.sessions.map((session, sessionIndex) => (
							<Grid
								container
								direction="row"
								justifyContent="space-between"
								alignItems="center"
								spacing={2}
								style={{ width: isLargeMobile ? '550px' : '100%' }}
								key={session.id}
							>
								<Grid item xs={4}>
									<Typography className="body-standard">
										{formatDateWithWeekday(session.date)}
									</Typography>
								</Grid>
								<Grid item xs>
									<Typography className="body-standard">
										{session.schedule.startTime.substring(0, 5)}
										–
										{session.schedule.endTime.substring(0, 5)}
										{' '}
									</Typography>
								</Grid>
								<Grid item xs>
									<Typography className="body-standard">
										{session.schedule.capacity}
									</Typography>
								</Grid>
								<Grid item xs>
									<Typography
										className="components-buttons-thin"
										onClick={() => handleViewStudents(session.id)}
										style={{
											display: isLaptop ? '' : 'flex',
										}}
									>
										View Students
									</Typography>
								</Grid>
							</Grid>
						)) : values.terms.filter(term => isFuture(term.endDate))
							.map((term, id) => (
								<Grid
									container
									direction="row"
									justifyContent="space-between"
									alignItems="center"
									spacing={2}
									style={{ width: isLargeMobile ? '550px' : '100%' }}
									key={term.id}
								>
									{term.schedules.filter(schedule => isFuture(schedule.endDate)).length >= 1 && (
										<>
											<Grid
												item
												xs={12}
												style={{
													display: 'flex',
													justifyContent: 'center',
												}}
											>
												<Typography
													className="display-small-title"
													style={{ marginTop: '12px' }}
												>
													{term.name}
													{' from '}
													{formatDateWithWeekday(term.startDate)}
													{' to '}
													{formatDateWithWeekday(term.endDate)}
													{' of capacity '}
													{term.capacity}
													{' at price HKD '}
													{term.price}
												</Typography>
											</Grid>
											<Grid
												container
												direction="row"
												justifyContent="space-between"
												alignItems="center"
												spacing={2}
												style={{
													width: isLargeMobile ? '550px' : '100%',
												}}
											>
												<Grid item xs>
													<Typography className="body-emphasized">
														Date
													</Typography>
												</Grid>
												<Grid item xs>
													<Typography className="body-emphasized">
														Time
													</Typography>
												</Grid>
												<Grid item xs>
													<Typography className="body-emphasized">
														Capacity
													</Typography>
												</Grid>
												<Grid item xs>
													<Typography className="body-emphasized">
														Actions
													</Typography>
												</Grid>
											</Grid>
										</>
									)}
									{term.schedules.filter(schedule => isFuture(schedule.endDate))
										.map((schedule, scheduleIndex) => (schedule.sessions.filter(session => isFuture(session.date))
											.map((session, sessionIndex) => (
												<Grid
													container
													direction="row"
													spacing={2}
													justifyContent="space-between"
													alignItems="center"
													style={{ width: isLargeMobile ? '550px' : '100%' }}
													key={session.id}
												>
													<Grid item xs>
														<Typography className="body-standard">
															{formatDateWithWeekday(session.date)}
														</Typography>
													</Grid>
													<Grid item xs>
														<Typography className="body-standard">
															{schedule.startTime.substring(0, 5)}
															–
															{schedule.endTime.substring(0, 5)}
															{' '}
														</Typography>
													</Grid>
													<Grid item xs>
														<Typography className="body-standard">
															{schedule.capacity}
														</Typography>
													</Grid>
													<Grid item xs>
														<Typography
															className="body-standard"
															style={{ display: isLaptop ? '' : 'flex' }}
														>
															<Typography
																className="components-buttons-thin"
																onClick={() => handleViewStudents(session.id)}
															>
																View Students
															</Typography>
														</Typography>
													</Grid>
												</Grid>
											))))}
								</Grid>
							))}
						<Grid item xs={12} className={classes.contentFlexEnd}>
							<Button
								color="primary"
								onClick={() => {
									if (values.locationId) {
										values.classType == 'session' ? setDialogOpen({
											type: 'Session',
											state: true,
											initialValues: {
												schedule: {
													capacity: '',
													dayOfWeek: new Date().getDay(),
													day: new Date(),
													type: 'once',
													endDay: new Date(),
												},
											},
											title: 'Add Session',
										}) : setDialogOpen({
											type: 'Term',
											state: true,
											initialValues: {
												term: {
													capacity: '',
													endDate: new Date(),
													startDate: new Date(),
													name: '',
													price: '',
													schedules: [{
														capacity: '',
														dayOfWeek: new Date().getDay(),
														day: new Date(),
														type: 'indefinitely',
														endDay: new Date(),
													}],
												},
											},
											title: 'Add Term',
										});
									} else {
										openSnackbar('info', `Please add location and staff before adding additional ${values.classType === 'session' ? 'sessions' : 'terms'}`);
									}
								}}
							>
								{values.classType === 'session' ? 'Add Additional Sessions' : 'Add Additional Term'}
							</Button>
						</Grid>
					</Paper>
					<Paper className="card">
						<Grid
							container
							direction="row"
							justifyContent="space-between"
							alignItems="flex-end"
						>
							<Grid item xs={12}>
								<Formik
									initialValues={values}
									validationSchema={requiredNotesValidationSchema}
									onSubmit={handleNotesSubmit}
								>
									{({
										  values,
										  setFieldValue,
										  ...p
									  }) => (
										<Form>
											<Grid
												container
												spacing={2}
												direction="row"
												justifyContent="space-between"
												alignItems="center"
											>
												<Grid item xs={12} sm={9} md={9}>
													<Field
														as={Textarea}
														setFieldValue={setFieldValue}
														label="Class Notes"
														name="note"
														rows={1}
														placeholder="Add a note"
													/>
												</Grid>
												<Grid item xs={12} sm={3} md={3}>
													<Button
														color="secondary"
														type="submit"
														disabled={p.isSubmitting}
														style={{
															backgroundImage: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
															float: 'right',
														}}
													>
														Save
													</Button>
												</Grid>
											</Grid>
										</Form>
									)}
								</Formik>
							</Grid>
							{values.notes.length === 0 ? (
								<Grid item xs={12}>
									<Typography className="body-subduced">
										You haven’t added any notes yet.
									</Typography>
								</Grid>
							) : (
								<Grid item xs={12}>
									{values.notes.map((item, notesIndex) => (
										<Grid
											container
											spacing={2}
											direction="row"
											justifyContent="start"
											alignItems="start"
											key={item.id}
										>
											<Grid item xs={2} align="left">
												{formatDate(item.updated)}
											</Grid>
											<Grid item xs={10} align="left">
												<Typography className="body-standard" key={notesIndex}>
													{item.text}
												</Typography>
											</Grid>
										</Grid>
									))}
								</Grid>
							)}
						</Grid>
					</Paper>
					{/* <Paper className="card"> */}
					{/* 	<Grid */}
					{/* 		container */}
					{/* 		direction="row" */}
					{/* 		justifyContent="space-between" */}
					{/* 		alignItems="flex-end" */}
					{/* 	> */}
					{/* 		<Grid item xs={12}> */}
					{/* 			<Typography */}
					{/* 				className="display-small-normal" */}
					{/* 				style={{ marginBottom: '1em' }} */}
					{/* 			> */}
					{/* 				Discounts */}
					{/* 			</Typography> */}
					{/* 		</Grid> */}
					{/* 		{showAddDiscountButton && ( */}
					{/* 			<Grid container spacing={2}> */}
					{/* 				<Grid item xs={12} sm={12}> */}
					{/* 					<Button */}
					{/* 						style={{ marginBottom: '20px' }} */}
					{/* 						color="primary" */}
					{/* 						onClick={handleAddDiscount} */}
					{/* 					> */}
					{/* 						Add discount */}
					{/* 					</Button> */}
					{/* 				</Grid> */}
					{/* 			</Grid> */}
					{/* 		)} */}
					{/* 		<Grid item xs={12}> */}
					{/* 			<Grid item xs={12}> */}
					{/* 				{values.discounts?.length > 0 && ( */}
					{/* 					<table className={classes.table}> */}
					{/* 						<thead> */}
					{/* 						<tr> */}
					{/* 							<th className={classes.th}>Discount Code</th> */}
					{/* 							<th className={classes.th}>Discount %</th> */}
					{/* 							<th className={classes.th}>Action</th> */}
					{/* 						</tr> */}
					{/* 						</thead> */}
					{/* 						<tbody> */}
					{/* 						{values.discounts.map((field, id) => ( */}
					{/* 							<tr className={classes.tr} key={field.id}> */}
					{/* 								<td className={classes.td} style={{ width: '50%' }}> */}
					{/* 									{ */}
					{/* 										id === updatedDiscountId || (!showAddDiscountButton && values.discounts.length - 1 == id) ? ( */}
					{/* 											<Field */}
					{/* 												as={TextField} */}
					{/* 												setFieldValue={(fieldName, value) => setFieldValue(fieldName, value.toUpperCase())} */}
					{/* 												name={`discounts[${id}].code`} */}
					{/* 												value={field.code} */}
					{/* 												placeholder="Enter discount code (e.g. SAVE10)." */}
					{/* 											/> */}
					{/* 										) : ( */}
					{/* 											field.code */}
					{/* 										) */}
					{/* 									} */}
					{/* 								</td> */}
					{/* 								<td className={classes.td} style={{ width: '35%' }}> */}
					{/* 									{ */}
					{/* 										id === updatedDiscountId || (!showAddDiscountButton && values.discounts.length - 1 == id) ? ( */}
					{/* 											<Field */}
					{/* 												as={TextField} */}
					{/* 												setFieldValue={setFieldValue} */}
					{/* 												value={field.percent} */}
					{/* 												name={`discounts[${id}].percent`} */}
					{/* 												placeholder="Enter discount %." */}
					{/* 											/> */}
					{/* 										) : ( */}
					{/* 											field.percent */}
					{/* 										) */}
					{/* 									} */}
					{/* 								</td> */}
					{/* 								<td */}
					{/* 									className={classes.td} */}
					{/* 									style={{ width: '15%' }} */}
					{/* 								> */}
					{/* 									{ */}
					{/* 										!showAddDiscountButton && id === values.discounts.length - 1 && updatedDiscountId === '' ? ( */}
					{/* 											<Grid */}
					{/* 												item */}
					{/* 												xs={12} */}
					{/* 												sm={2} */}
					{/* 												lg={1} */}
					{/* 												className={classes.icons} */}
					{/* 											> */}
					{/* 												<IconButton */}
					{/* 													onClick={() => handleValidateDiscount(field)} */}
					{/* 												> */}
					{/* 													<CheckIcon /> */}
					{/* 												</IconButton> */}
					{/* 												<IconButton */}
					{/* 													onClick={() => handleRemoveDiscount(id)} */}
					{/* 												> */}
					{/* 													<CloseIcon /> */}
					{/* 												</IconButton> */}
					{/* 											</Grid> */}
					{/* 										) : id === updatedDiscountId ? ( */}
					{/* 											<Grid */}
					{/* 												item */}
					{/* 												xs={12} */}
					{/* 												sm={2} */}
					{/* 												lg={1} */}
					{/* 												className={classes.icons} */}
					{/* 											> */}
					{/* 												<IconButton */}
					{/* 													onClick={() => handleValidateDiscount(field)} */}
					{/* 												> */}
					{/* 													<CheckIcon /> */}
					{/* 												</IconButton> */}
					{/* 												<IconButton onClick={() => handleCloseDiscount(id)}> */}
					{/* 													<CloseIcon /> */}
					{/* 												</IconButton> */}
					{/* 											</Grid> */}
					{/* 										) : ( */}
					{/* 											<Grid */}
					{/* 												item */}
					{/* 												xs={12} */}
					{/* 												sm={2} */}
					{/* 												lg={1} */}
					{/* 												className={classes.icons} */}
					{/* 											> */}
					{/* 												<IconButton */}
					{/* 													onClick={() => updatedDiscountId == '' && showAddDiscountButton && handleUpdateDiscount(id)} */}
					{/* 												> */}
					{/* 													<EditIcon /> */}
					{/* 												</IconButton> */}
					{/* 												<IconButton */}
					{/* 													onClick={() => updatedDiscountId == '' && showAddDiscountButton && handleRemoveDiscount(id)} */}
					{/* 												> */}
					{/* 													<DeleteIcon /> */}
					{/* 												</IconButton> */}
					{/* 											</Grid> */}
					{/* 										) */}
					{/* 									} */}
					{/* 								</td> */}
					{/* 							</tr> */}
					{/* 						))} */}
					{/* 						</tbody> */}
					{/* 					</table> */}
					{/* 				)} */}
					{/* 				<Button */}
					{/* 					color="secondary" */}
					{/* 					onClick={handleUpdateAllDiscounts} */}
					{/* 					style={{ */}
					{/* 						backgroundImage: */}
					{/* 							'linear-gradient(to bottom, #ffffff, #f9fafb)', */}
					{/* 						float: 'right', */}
					{/* 						marginTop: '1em', */}
					{/* 					}} */}
					{/* 				> */}
					{/* 					Save */}
					{/* 				</Button> */}
					{/* 			</Grid> */}
					{/* 		</Grid> */}
					{/* 	</Grid> */}
					{/* </Paper> */}
				</>
			)}
		</div>
	);
}

export default ClassesForm;
// TODO: This component need to be rewritten from scratch
